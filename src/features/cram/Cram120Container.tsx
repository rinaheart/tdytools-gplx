import React, { useState, useEffect, useRef } from 'react';
import type { Question, ExamProfile, ExamRecord, UserProgressItem, ActivityMode } from '../../types/quiz';
import type { CramSession, CramStage, CramActiveExamDraft } from '../../types/cram';
import {
  saveCramSession,
  pauseCramSession,
  resumeCramSession,
  abandonCramSession,
  advanceCramStage,
  selectWeaknessSprintIds,
  calculateCramReadiness
} from '../../services/cramEngine';

import { CramDrillStage } from './stages/CramDrillStage';
import { CramExamStage } from './stages/CramExamStage';
import { FailureAnalysisStage } from './stages/FailureAnalysisStage';
import { CramResultStage } from './stages/CramResultStage';
import { db } from '../../db/dexie';

import {
  Clock,
  Pause,
  Play,
  LogOut,
  Flame,
  X
} from 'lucide-react';

interface Cram120ContainerProps {
  session: CramSession;
  questions: Question[];
  profile: ExamProfile;
  examHistory: ExamRecord[];
  progressMap?: Map<string, UserProgressItem>;
  onRecordAnswer: (
    questionId: string,
    selectedOptionId: number,
    context?: { mode?: ActivityMode; sessionId?: string; examId?: string }
  ) => void;
  onExitCram: () => void;
  onUpdateSession: (updated: CramSession) => void;
  onOpenReview: () => void;
}

export const Cram120Container: React.FC<Cram120ContainerProps> = ({
  session,
  questions,
  profile,
  examHistory,
  progressMap = new Map(),
  onRecordAnswer,
  onExitCram,
  onUpdateSession,
  onOpenReview
}) => {
  const [currentSession, setCurrentSession] = useState<CramSession>(session);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [localExams, setLocalExams] = useState<Record<string, ExamRecord>>({});

  useEffect(() => {
    let isMounted = true;
    const loadMissingExams = async () => {
      const neededIds = [currentSession.exam1Id, currentSession.exam2Id].filter(Boolean) as string[];
      for (const id of neededIds) {
        if (!localExams[id] && !examHistory.some(e => e.id === id)) {
          const rec = await db.examHistory.get(id);
          if (rec && isMounted) {
            setLocalExams(prev => ({ ...prev, [id]: rec }));
          }
        }
      }
    };
    loadMissingExams();
    return () => {
      isMounted = false;
    };
  }, [currentSession.exam1Id, currentSession.exam2Id, examHistory]);

  const getExamRecord = (id?: string): ExamRecord | undefined => {
    if (!id) return undefined;
    return localExams[id] || examHistory.find(e => e.id === id);
  };

  const currentSessionRef = useRef<CramSession>(currentSession);
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  useEffect(() => {
    setCurrentSession(session);
  }, [session]);

  const handleStageRecordAnswer = (questionId: string, selectedOptionId: number) => {
    onRecordAnswer(questionId, selectedOptionId, {
      mode: 'cram-120',
      sessionId: currentSessionRef.current.id
    });
  };

  const handlePersistPatch = async (patch: Partial<CramSession>) => {
    const merged: CramSession = {
      ...currentSessionRef.current,
      ...patch
    };
    currentSessionRef.current = merged;
    setCurrentSession(merged);
    await saveCramSession(merged);
  };

  const handlePersistExamDraft = async (draft: CramActiveExamDraft) => {
    await handlePersistPatch({ activeCramExam: draft });
  };

  const [remainingTotalSeconds, setRemainingTotalSeconds] = useState(() => {
    const deadlineMs = new Date(currentSession.deadlineAt).getTime();
    return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
  });

  const handleSessionExpired = async () => {
    const freshSession = currentSessionRef.current;
    const exam1Rec = getExamRecord(freshSession.exam1Id) || (freshSession.exam1Id ? await db.examHistory.get(freshSession.exam1Id) : undefined);
    const exam2Rec = getExamRecord(freshSession.exam2Id) || (freshSession.exam2Id ? await db.examHistory.get(freshSession.exam2Id) : undefined);
    const readiness = calculateCramReadiness(freshSession, exam1Rec, exam2Rec);

    const expiredSession: CramSession = {
      ...freshSession,
      status: 'expired',
      completedAt: new Date().toISOString(),
      readiness
    };

    setCurrentSession(expiredSession);
    onUpdateSession(expiredSession);
    await saveCramSession(expiredSession);
  };

  useEffect(() => {
    if (currentSession.isPaused || currentSession.status !== 'active') return;

    const timer = setInterval(() => {
      const deadlineMs = new Date(currentSessionRef.current.deadlineAt).getTime();
      const diff = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemainingTotalSeconds(diff);

      if (diff <= 0) {
        clearInterval(timer);
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession.deadlineAt, currentSession.isPaused, currentSession.status]);

  const handleTogglePause = async () => {
    const fresh = currentSessionRef.current;
    const updated = fresh.isPaused ? resumeCramSession(fresh) : pauseCramSession(fresh);
    setCurrentSession(updated);
    onUpdateSession(updated);
    await saveCramSession(updated);
  };

  const handleSafeExit = async () => {
    await saveCramSession(currentSessionRef.current);
    onUpdateSession(currentSessionRef.current);
    onExitCram();
  };

  const handleAbandon = async () => {
    const fresh = currentSessionRef.current;
    await abandonCramSession(fresh);
    onUpdateSession({ ...fresh, status: 'abandoned' });
    onExitCram();
  };

  const computeElapsedInCurrentStage = (s: CramSession): number => {
    return Math.max(0, Math.floor((Date.now() - new Date(s.stageStartedAt).getTime()) / 1000));
  };

  const handleCompleteTriage = async ({ mistakeIds, answeredIds }: { mistakeIds: string[]; answeredIds: string[] }) => {
    const fresh = currentSessionRef.current;
    const updatedWithData: CramSession = {
      ...fresh,
      triageMistakeIds: mistakeIds,
      triageAnsweredIds: answeredIds,
      criticalRepairRemainingIds: mistakeIds
    };
    const nextSession = advanceCramStage(updatedWithData, 'critical-repair', computeElapsedInCurrentStage(fresh));
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleCompleteRepair = async ({ mistakeIds }: { mistakeIds: string[] }) => {
    const fresh = currentSessionRef.current;
    const updatedWithData: CramSession = {
      ...fresh,
      criticalRepairRemainingIds: mistakeIds
    };
    const nextSession = advanceCramStage(updatedWithData, 'exam-1', computeElapsedInCurrentStage(fresh));
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleCompleteExam1 = async (record: ExamRecord) => {
    setLocalExams(prev => ({ ...prev, [record.id]: record }));
    const mistakeIds = Object.entries(record.answers)
      .filter(([_, ans]) => !ans.isCorrect)
      .map(([qId]) => qId);

    const fresh = currentSessionRef.current;
    const updatedWithData: CramSession = {
      ...fresh,
      exam1Id: record.id,
      exam1MistakeIds: mistakeIds
    };

    const nextSession = advanceCramStage(updatedWithData, 'analysis');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleProceedToSprint = async (weakCategories: Question['category'][]) => {
    const fresh = currentSessionRef.current;
    const weakQuestionIds = selectWeaknessSprintIds(
      questions,
      progressMap,
      fresh.exam1MistakeIds,
      weakCategories,
      fresh.sessionSeed
    );
    const updatedWithWeak: CramSession = {
      ...fresh,
      weakQuestionIds
    };
    const nextSession = advanceCramStage(updatedWithWeak, 'weakness-sprint');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleCompleteSprint = async () => {
    const nextSession = advanceCramStage(currentSessionRef.current, 'exam-2');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleCompleteExam2 = async (record: ExamRecord) => {
    setLocalExams(prev => ({ ...prev, [record.id]: record }));
    const mistakeIds = Object.entries(record.answers)
      .filter(([_, ans]) => !ans.isCorrect)
      .map(([qId]) => qId);

    const fresh = currentSessionRef.current;
    const updatedWithData: CramSession = {
      ...fresh,
      exam2Id: record.id,
      exam2MistakeIds: mistakeIds
    };

    const nextSession = advanceCramStage(updatedWithData, 'final-check');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  const handleCompleteFinalCheck = async ({ mistakeIds }: { mistakeIds: string[] }) => {
    const fresh = currentSessionRef.current;
    const exam1Rec = getExamRecord(fresh.exam1Id) || (fresh.exam1Id ? await db.examHistory.get(fresh.exam1Id) : undefined);
    const exam2Rec = getExamRecord(fresh.exam2Id) || (fresh.exam2Id ? await db.examHistory.get(fresh.exam2Id) : undefined);

    const updatedWithData: CramSession = {
      ...fresh,
      finalCheckRemainingIds: mistakeIds,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    updatedWithData.readiness = calculateCramReadiness(updatedWithData, exam1Rec, exam2Rec);

    setCurrentSession(updatedWithData);
    onUpdateSession(updatedWithData);
    await saveCramSession(updatedWithData);
  };

  const stageInfo: Record<CramStage, { step: number; title: string }> = {
    'critical-triage': { step: 1, title: 'Chẩn đoán 60 câu điểm liệt' },
    'critical-repair': { step: 2, title: 'Sửa lỗi điểm liệt' },
    'exam-1': { step: 3, title: 'Thi thử chuẩn #1' },
    'analysis': { step: 4, title: 'Phân tích lỗ hổng' },
    'weakness-sprint': { step: 5, title: 'Sprint vá điểm yếu' },
    'exam-2': { step: 6, title: 'Thi thử kiểm chứng #2' },
    'final-check': { step: 7, title: 'Kiểm tra an toàn cuối' }
  };

  const currentStageMeta = stageInfo[currentSession.currentStage];

  const hours = Math.floor(remainingTotalSeconds / 3600);
  const minutes = Math.floor((remainingTotalSeconds % 3600) / 60);
  const seconds = remainingTotalSeconds % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const exam1Rec = getExamRecord(currentSession.exam1Id);
  const exam2Rec = getExamRecord(currentSession.exam2Id);

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* 1. STICKY TOP HUD BAR */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 py-3 px-3 sm:px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/20 flex-shrink-0">
              <Flame className="w-4 h-4" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Cấp Tốc 120 Phút
                </span>
                <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono">
                  Giai đoạn {currentStageMeta.step}/7
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden sm:block">
                {currentStageMeta.title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono tabular-nums text-xs font-bold border transition-colors ${
              currentSession.isPaused
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : remainingTotalSeconds < 600
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{currentSession.isPaused ? 'TẠM DỪNG' : timeFormatted}</span>
            </div>

            <button
              type="button"
              onClick={handleTogglePause}
              title={currentSession.isPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
              aria-label={currentSession.isPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
            >
              {currentSession.isPaused ? (
                <Play className="w-4 h-4 text-emerald-500 fill-current" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              title="Tùy chọn thoát"
              aria-label="Tùy chọn thoát lộ trình cấp tốc"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. PAUSED OVERLAY */}
      {currentSession.isPaused && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 text-center space-y-2 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <Pause className="w-4 h-4" />
            <span>Phiên ôn tập đang được tạm dừng</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Bộ đếm giờ 120 phút và bài thi thử đang đóng băng an toàn. Bấm tiếp tục khi bạn sẵn sàng.
          </p>
          <button
            type="button"
            onClick={handleTogglePause}
            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-md transition active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Tiếp tục phiên học</span>
          </button>
        </div>
      )}

      {/* 3. ACTIVE STAGE CONTENT */}
      <div className="max-w-5xl mx-auto px-3 sm:px-6">
        {currentSession.status === 'completed' || currentSession.status === 'expired' ? (
          <CramResultStage
            session={currentSession}
            questions={questions}
            progressMap={progressMap}
            exam1Record={exam1Rec}
            exam2Record={exam2Rec}
            onFinish={onExitCram}
            onRetestWeak={onOpenReview}
          />
        ) : (
          <>
            {currentSession.currentStage === 'critical-triage' && (
              <CramDrillStage
                key="critical-triage"
                mode="critical-triage"
                questions={questions}
                progressMap={progressMap}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onPersistSession={handlePersistPatch}
                onCompleteStage={handleCompleteTriage}
              />
            )}

            {currentSession.currentStage === 'critical-repair' && (
              <CramDrillStage
                key="critical-repair"
                mode="critical-repair"
                questions={questions}
                progressMap={progressMap}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onPersistSession={handlePersistPatch}
                onCompleteStage={handleCompleteRepair}
              />
            )}

            {currentSession.currentStage === 'exam-1' && (
              <CramExamStage
                key="cram-exam-1"
                examNumber={1}
                session={currentSession}
                questions={questions}
                profile={profile}
                onPersistDraft={handlePersistExamDraft}
                onExamComplete={handleCompleteExam1}
              />
            )}

            {currentSession.currentStage === 'analysis' && (
              exam1Rec ? (
                <FailureAnalysisStage
                  examRecord={exam1Rec}
                  questions={questions}
                  onProceedToSprint={handleProceedToSprint}
                />
              ) : (
                <div className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-8 text-center space-y-3">
                  <div className="w-8 h-8 mx-auto border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                    Đang tải dữ liệu phân tích bài thi...
                  </p>
                </div>
              )
            )}

            {currentSession.currentStage === 'weakness-sprint' && (
              <CramDrillStage
                key="weakness-sprint"
                mode="weakness-sprint"
                questions={questions}
                progressMap={progressMap}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onPersistSession={handlePersistPatch}
                onCompleteStage={handleCompleteSprint}
              />
            )}

            {currentSession.currentStage === 'exam-2' && (
              <CramExamStage
                key="cram-exam-2"
                examNumber={2}
                session={currentSession}
                questions={questions}
                profile={profile}
                onPersistDraft={handlePersistExamDraft}
                onExamComplete={handleCompleteExam2}
              />
            )}

            {currentSession.currentStage === 'final-check' && (
              <CramDrillStage
                key="final-check"
                mode="final-check"
                questions={questions}
                progressMap={progressMap}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onPersistSession={handlePersistPatch}
                onCompleteStage={handleCompleteFinalCheck}
              />
            )}
          </>
        )}
      </div>

      {/* 4. EXIT / ABANDON MODAL */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Tùy chọn rời khỏi lộ trình cấp tốc"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Rời Khỏi Lộ Trình Cấp Tốc?
              </h4>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                aria-label="Đóng hộp thoại"
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có thể chọn <strong>Lưu lại và tiếp tục sau</strong> (giữ nguyên câu hỏi đang làm) hoặc <strong>Hủy bỏ lộ trình</strong> để bắt đầu mới vào lần sau.
            </p>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSafeExit}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm transition"
              >
                Lưu lại & Quay về Dashboard
              </button>

              <button
                type="button"
                onClick={handleAbandon}
                className="w-full py-2.5 px-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 font-bold text-xs rounded-xl hover:bg-rose-100 transition"
              >
                Hủy bỏ lộ trình này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
