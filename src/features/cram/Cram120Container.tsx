import React, { useState, useEffect, useRef } from 'react';
import type { Question, ExamProfile, ExamRecord, UserProgressItem, ActivityMode } from '../../types/quiz';
import type { CramSession, CramStage } from '../../types/cram';
import {
  saveCramSession,
  pauseCramSession,
  resumeCramSession,
  abandonCramSession,
  advanceCramStage,
  calculateCramReadiness
} from '../../services/cramEngine';

// Stage components
import { CriticalTriageStage } from './stages/CriticalTriageStage';
import { CriticalRepairStage } from './stages/CriticalRepairStage';
import { CramExamStage } from './stages/CramExamStage';
import { FailureAnalysisStage } from './stages/FailureAnalysisStage';
import { WeaknessSprintStage } from './stages/WeaknessSprintStage';
import { FinalSafetyCheckStage } from './stages/FinalSafetyCheckStage';
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
    optionOrCorrect: number | boolean,
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

  // Tải bản ghi bài thi từ Dexie nếu chưa có trong props hay local state (hỗ trợ F5 / tải lại)
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

  // Mutable ref giữ bản session mới nhất, ngăn ngừa stale closure trong các async handler & timer
  const currentSessionRef = useRef<CramSession>(currentSession);
  useEffect(() => {
    currentSessionRef.current = currentSession;
  }, [currentSession]);

  // Helper đảm bảo mọi câu trả lời trong Cram đều mang mode='cram-120' và sessionId
  const handleStageRecordAnswer = (questionId: string, isCorrect: boolean) => {
    onRecordAnswer(questionId, isCorrect, {
      mode: 'cram-120',
      sessionId: currentSessionRef.current.id
    });
  };

  // Cập nhật khi prop session thay đổi
  useEffect(() => {
    setCurrentSession(session);
  }, [session]);

  // Wall-clock Countdown timer cho toàn phiên (dựa theo deadlineAt)
  const [remainingTotalSeconds, setRemainingTotalSeconds] = useState(() => {
    const deadlineMs = new Date(currentSession.deadlineAt).getTime();
    return Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
  });

  useEffect(() => {
    if (currentSession.isPaused || currentSession.status !== 'active') return;

    const timer = setInterval(() => {
      const deadlineMs = new Date(currentSessionRef.current.deadlineAt).getTime();
      const diff = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      setRemainingTotalSeconds(diff);

      if (diff <= 0) {
        // Hết thời gian tối đa 120 phút: Chuyển trạng thái expired và tính readiness
        clearInterval(timer);
        handleSessionExpired();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentSession.deadlineAt, currentSession.isPaused, currentSession.status]);

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

  // Toggle Pause/Resume
  const handleTogglePause = async () => {
    let updated: CramSession;
    if (currentSession.isPaused) {
      updated = resumeCramSession(currentSession);
    } else {
      updated = pauseCramSession(currentSession);
    }

    setCurrentSession(updated);
    onUpdateSession(updated);
    await saveCramSession(updated);
  };

  // Thoát an toàn (lưu session để quay lại sau)
  const handleSafeExit = async () => {
    await saveCramSession(currentSessionRef.current);
    onExitCram();
  };

  // Hủy bỏ phiên hoàn toàn
  const handleAbandon = async () => {
    await abandonCramSession(currentSession);
    onExitCram();
  };

  // 1. Sau khi xong Stage 1: Critical Triage
  const handleCompleteTriage = async (mistakes: string[], answered: string[]) => {
    const updatedWithData: CramSession = {
      ...currentSession,
      triageMistakeIds: mistakes,
      triageAnsweredIds: answered,
      criticalRepairRemainingIds: mistakes
    };

    const nextSession = advanceCramStage(updatedWithData, 'critical-repair');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 2. Sau khi xong Stage 2: Critical Repair
  const handleCompleteRepair = async (remainingMistakes: string[]) => {
    const updatedWithData: CramSession = {
      ...currentSession,
      criticalRepairRemainingIds: remainingMistakes
    };

    const nextSession = advanceCramStage(updatedWithData, 'exam-1');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 3. Sau khi hoàn thành Exam 1
  const handleCompleteExam1 = async (record: ExamRecord) => {
    // Lưu record vào local state ngay lập tức để render liền mạch stage tiếp theo
    setLocalExams(prev => ({ ...prev, [record.id]: record }));

    const mistakeIds = Object.entries(record.answers)
      .filter(([_, ans]) => !ans.isCorrect)
      .map(([qId]) => qId);

    const updatedWithData: CramSession = {
      ...currentSession,
      exam1Id: record.id,
      exam1MistakeIds: mistakeIds
    };

    const nextSession = advanceCramStage(updatedWithData, 'analysis');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 4. Sau khi xem Failure Analysis xong, bắt đầu Weakness Sprint
  const handleProceedToSprint = async (_weakCategories: string[]) => {
    const nextSession = advanceCramStage(currentSession, 'weakness-sprint');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 5. Sau khi xong Weakness Sprint, chuyển sang Exam 2
  const handleCompleteSprint = async () => {
    const nextSession = advanceCramStage(currentSession, 'exam-2');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 6. Sau khi hoàn thành Exam 2
  const handleCompleteExam2 = async (record: ExamRecord) => {
    setLocalExams(prev => ({ ...prev, [record.id]: record }));

    const mistakeIds = Object.entries(record.answers)
      .filter(([_, ans]) => !ans.isCorrect)
      .map(([qId]) => qId);

    const updatedWithData: CramSession = {
      ...currentSession,
      exam2Id: record.id,
      exam2MistakeIds: mistakeIds
    };

    const nextSession = advanceCramStage(updatedWithData, 'final-check');
    setCurrentSession(nextSession);
    onUpdateSession(nextSession);
    await saveCramSession(nextSession);
  };

  // 7. Sau khi xong Final Safety Check -> Tính Readiness & Kết thúc phiên
  const handleCompleteFinalCheck = async (remainingErrors: string[]) => {
    const exam1Rec = getExamRecord(currentSession.exam1Id) || (currentSession.exam1Id ? await db.examHistory.get(currentSession.exam1Id) : undefined);
    const exam2Rec = getExamRecord(currentSession.exam2Id) || (currentSession.exam2Id ? await db.examHistory.get(currentSession.exam2Id) : undefined);

    const updatedWithData: CramSession = {
      ...currentSession,
      finalCheckRemainingIds: remainingErrors,
      status: 'completed',
      completedAt: new Date().toISOString()
    };

    const readiness = calculateCramReadiness(updatedWithData, exam1Rec, exam2Rec);
    updatedWithData.readiness = readiness;

    setCurrentSession(updatedWithData);
    onUpdateSession(updatedWithData);
    await saveCramSession(updatedWithData);
  };

  // Stages Map danh mục
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

  // Tính format thời gian tổng
  const hours = Math.floor(remainingTotalSeconds / 3600);
  const minutes = Math.floor((remainingTotalSeconds % 3600) / 60);
  const seconds = remainingTotalSeconds % 60;
  const timeFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const exam1Rec = getExamRecord(currentSession.exam1Id);
  const exam2Rec = getExamRecord(currentSession.exam2Id);

  return (
    <div className="space-y-4 pb-20 animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          1. STICKY TOP HUD BAR: Đồng hồ tổng + Stepper + Nút Pause/Exit
      ───────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0c1220]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 py-3 px-3 sm:px-6 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Cụm trái: Badge + Stepper */}
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

          {/* Cụm phải: Đồng hồ Wall-clock + Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Countdown Badge */}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold border transition-colors ${
              currentSession.isPaused
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300'
                : remainingTotalSeconds < 600
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}>
              <Clock className="w-3.5 h-3.5" />
              <span>{currentSession.isPaused ? 'TẠM DỪNG' : timeFormatted}</span>
            </div>

            {/* Nút Tạm dừng / Tiếp tục */}
            <button
              type="button"
              onClick={handleTogglePause}
              title={currentSession.isPaused ? 'Tiếp tục đếm giờ' : 'Tạm dừng đếm giờ'}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
            >
              {currentSession.isPaused ? (
                <Play className="w-4 h-4 text-emerald-500 fill-current" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>

            {/* Nút Thoát (Lưu lại) */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              title="Tùy chọn thoát"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition active:scale-95"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. PAUSED OVERLAY NẾU ĐANG TẠM DỪNG
      ───────────────────────────────────────────────────────────── */}
      {currentSession.isPaused && (
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/30 text-center space-y-2 animate-fade-in">
          <div className="flex items-center justify-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-sm">
            <Pause className="w-4 h-4" />
            <span>Phiên ôn tập đang được tạm dừng</span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Bộ đếm giờ 120 phút đang được đóng băng. Khi bạn sẵn sàng học tiếp, bấm nút bên dưới để tiếp tục.
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

      {/* ─────────────────────────────────────────────────────────────
          3. RENDER TỪNG STAGE THEO TRẠNG THÁI HIỆN TẠI
      ───────────────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6">
        {/* Nếu đã hoàn thành hoặc hết giờ: render màn hình kết quả */}
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
              <CriticalTriageStage
                questions={questions}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onCompleteStage={handleCompleteTriage}
              />
            )}

            {currentSession.currentStage === 'critical-repair' && (
              <CriticalRepairStage
                questions={questions}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onCompleteStage={handleCompleteRepair}
              />
            )}

            {currentSession.currentStage === 'exam-1' && (
              <CramExamStage
                examNumber={1}
                session={currentSession}
                questions={questions}
                profile={profile}
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
              <WeaknessSprintStage
                questions={questions}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onCompleteStage={handleCompleteSprint}
              />
            )}

            {currentSession.currentStage === 'exam-2' && (
              <CramExamStage
                examNumber={2}
                session={currentSession}
                questions={questions}
                profile={profile}
                onExamComplete={handleCompleteExam2}
              />
            )}

            {currentSession.currentStage === 'final-check' && (
              <FinalSafetyCheckStage
                questions={questions}
                session={currentSession}
                onRecordAnswer={handleStageRecordAnswer}
                onCompleteStage={handleCompleteFinalCheck}
              />
            )}
          </>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL XÁC NHẬN THOÁT / HỦY LỘ TRÌNH
      ───────────────────────────────────────────────────────────── */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                Rời Khỏi Lộ Trình Cấp Tốc?
              </h4>
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Bạn có thể chọn <strong>Lưu lại và tiếp tục sau</strong> (tiến độ được giữ nguyên) hoặc <strong>Hủy bỏ lộ trình</strong> nếu muốn bắt đầu lại từ đầu vào lần sau.
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
