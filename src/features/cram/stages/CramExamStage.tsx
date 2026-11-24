import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Question, ExamProfile, ExamRecord, ActiveExamSession } from '../../../types/quiz';
import type { CramSession, CramActiveExamDraft } from '../../../types/cram';
import { EXAM_MODE_POLICY } from '../../../types/quiz';
import { generateExam } from '../../../services/examEngine';
import { submitExamAtomically } from '../../../services/attemptService';
import { QuestionCard } from '../../../components/QuestionCard';
import { Clock, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

interface CramExamStageProps {
  examNumber: 1 | 2;
  session: CramSession;
  questions: Question[];
  profile: ExamProfile;
  onPersistDraft: (draft: CramActiveExamDraft) => void;
  onExamComplete: (record: ExamRecord) => void;
}

export const CramExamStage: React.FC<CramExamStageProps> = ({
  examNumber,
  session,
  questions,
  profile,
  onPersistDraft,
  onExamComplete
}) => {
  const seed = examNumber === 1 ? session.exam1Seed : session.exam2Seed;

  const examQuestionIds = useMemo(() => {
    return generateExam(profile, questions, seed);
  }, [profile, questions, seed]);

  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const examQuestions = useMemo(
    () => examQuestionIds.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined),
    [examQuestionIds, questionMap]
  );

  const examAllocatedSeconds = 1200;

  // Khôi phục bản nháp bài thi nếu có (bảo toàn 100% thời gian & câu trả lời qua F5 và Pause)
  const initialDraft = useMemo<CramActiveExamDraft>(() => {
    if (session.activeCramExam && session.activeCramExam.examNumber === examNumber) {
      return session.activeCramExam;
    }
    return {
      examNumber,
      startedAt: new Date().toISOString(),
      totalPausedSeconds: 0,
      answers: {},
      currentIndex: 0
    };
  }, [examNumber]);

  const [currentIndex, setCurrentIndex] = useState<number>(initialDraft.currentIndex);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>(initialDraft.answers);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const draftTimingRef = useRef({
    startedAt: initialDraft.startedAt,
    totalPausedSeconds: initialDraft.totalPausedSeconds,
    pausedAt: initialDraft.pausedAt
  });

  // Đồng bộ timing khi người dùng bấm Pause / Resume trên thanh HUD của Cram120Container
  useEffect(() => {
    if (session.activeCramExam && session.activeCramExam.examNumber === examNumber) {
      draftTimingRef.current = {
        startedAt: session.activeCramExam.startedAt,
        totalPausedSeconds: session.activeCramExam.totalPausedSeconds,
        pausedAt: session.activeCramExam.pausedAt
      };
    }
  }, [session.activeCramExam, examNumber]);

  const answersRef = useRef<Record<string, number | undefined>>(answers);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // Lưu khởi tạo draft nếu chưa có trong session
  useEffect(() => {
    if (!session.activeCramExam || session.activeCramExam.examNumber !== examNumber) {
      onPersistDraft(initialDraft);
    }
  }, [examNumber]);

  const computeActiveElapsedSeconds = () => {
    const { startedAt, totalPausedSeconds, pausedAt } = draftTimingRef.current;
    const endRefMs = session.isPaused && pausedAt ? new Date(pausedAt).getTime() : Date.now();
    const rawElapsed = Math.floor((endRefMs - new Date(startedAt).getTime()) / 1000);
    return Math.max(0, rawElapsed - totalPausedSeconds);
  };

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, examAllocatedSeconds - computeActiveElapsedSeconds())
  );

  const hasAutoSubmittedRef = useRef(false);

  const executeSubmit = async () => {
    if (isSubmitting || hasAutoSubmittedRef.current) return;
    hasAutoSubmittedRef.current = true;
    setIsSubmitting(true);
    setShowSubmitConfirm(false);

    const completedAt = new Date();
    const activeElapsedSec = Math.min(examAllocatedSeconds, computeActiveElapsedSeconds());
    const effectiveStartedAt = new Date(completedAt.getTime() - activeElapsedSec * 1000).toISOString();

    const activeSessionStub: ActiveExamSession = {
      examId: `cram_exam_${examNumber}_${session.id}`,
      profileId: profile.id,
      title: `Thi Thử Cấp Tốc #${examNumber} (30 câu)`,
      questionBankVersionId: profile.questionBankVersionId,
      questionIds: examQuestionIds,
      startedAt: effectiveStartedAt,
      allocatedDurationSeconds: examAllocatedSeconds,
      answers: answersRef.current,
      isSubmitted: true
    };

    const record = await submitExamAtomically({
      activeSession: activeSessionStub,
      profile,
      questions,
      completedAt: completedAt.toISOString(),
      mode: 'cram-120',
      examType: 'random',
      cramSessionId: session.id
    });

    onExamComplete(record);
  };

  useEffect(() => {
    if (session.isPaused || isSubmitting) return;

    const updateTimer = () => {
      const left = Math.max(0, examAllocatedSeconds - computeActiveElapsedSeconds());
      setRemainingSeconds(left);
      if (left <= 0) {
        executeSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session.isPaused, isSubmitting]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (session.isPaused || showSubmitConfirm) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [examQuestions.length, session.isPaused, showSubmitConfirm]);

  const currentQ = examQuestions[currentIndex];

  const [autoAdvance, setAutoAdvance] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tdy_auto_advance_exam');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleAutoAdvance = () => {
    setAutoAdvance(prev => {
      const next = !prev;
      try {
        localStorage.setItem('tdy_auto_advance_exam', String(next));
      } catch {}
      return next;
    });
  };

  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
  }, []);

  const syncDraft = (nextAnswers: Record<string, number | undefined>, nextIdx: number) => {
    onPersistDraft({
      examNumber,
      startedAt: draftTimingRef.current.startedAt,
      totalPausedSeconds: draftTimingRef.current.totalPausedSeconds,
      pausedAt: draftTimingRef.current.pausedAt,
      answers: nextAnswers,
      currentIndex: nextIdx
    });
  };

  const handleSelectOption = (optionId: number) => {
    if (!currentQ || isSubmitting || session.isPaused) return;
    const isUnselecting = answers[currentQ.id] === optionId;
    const nextAnswers = {
      ...answers,
      [currentQ.id]: isUnselecting ? undefined : optionId
    };
    setAnswers(nextAnswers);

    const willAdvance = autoAdvance && !isUnselecting && currentIndex < examQuestions.length - 1;
    syncDraft(nextAnswers, willAdvance ? currentIndex + 1 : currentIndex);

    if (willAdvance) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1));
      }, 250);
    }
  };

  const handleRequestSubmit = () => {
    const answeredCount = Object.values(answers).filter(v => v !== undefined).length;
    if (answeredCount < examQuestions.length) {
      setShowSubmitConfirm(true);
    } else {
      executeSubmit();
    }
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const answeredCount = Object.values(answers).filter(v => v !== undefined).length;
  const unansweredCount = examQuestions.length - answeredCount;

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
      {/* Exam Header Bar */}
      <div className="bg-slate-900 dark:bg-[#121826] text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">
            {examNumber === 1 ? 'Bài Thi Thử Chẩn Đoán #1' : 'Bài Thi Thử Kiểm Chứng #2'}
          </div>
          <h3 className="text-sm sm:text-base font-bold text-white">
            30 Câu Sát Hạch • Đạt ≥ 27 & 0 Sai Điểm Liệt
          </h3>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl font-mono tabular-nums text-sm font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRequestSubmit}
            disabled={isSubmitting || session.isPaused}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition touch-target"
          >
            Nộp bài
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: QuestionCard dùng chung (hỗ trợ Zoom ảnh sa hình/biển báo) */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Đã làm: <strong className="font-mono text-slate-900 dark:text-white">{answeredCount}</strong>/30 câu
            </span>
            <button
              type="button"
              onClick={toggleAutoAdvance}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                autoAdvance
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
                  : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
              }`}
              title="Tự động chuyển sang câu tiếp theo sau khi chọn đáp án"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${autoAdvance ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
              <span>Tự chuyển câu: {autoAdvance ? 'BẬT' : 'TẮT'}</span>
            </button>
          </div>

          {currentQ && (
            <>
              <QuestionCard
                question={currentQ}
                policy={EXAM_MODE_POLICY}
                selectedOptionId={answers[currentQ.id]}
                onSelectOption={handleSelectOption}
                showIndex={currentIndex + 1}
                totalInList={examQuestions.length}
              />

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    const nextIdx = Math.max(0, currentIndex - 1);
                    setCurrentIndex(nextIdx);
                    syncDraft(answers, nextIdx);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition touch-target"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-400">←</kbd>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === examQuestions.length - 1}
                  onClick={() => {
                    const nextIdx = Math.min(examQuestions.length - 1, currentIndex + 1);
                    setCurrentIndex(nextIdx);
                    syncDraft(answers, nextIdx);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition touch-target"
                >
                  <span>Câu sau</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded">→</kbd>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Cột phải: Lưới 30 câu hỏi */}
        <div className="lg:col-span-4 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lưới Câu Hỏi (30)
            </h5>
            <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">
              {answeredCount}/30
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {examQuestions.map((q, idx) => {
              const hasChosen = answers[q.id] !== undefined;
              const isCurrent = idx === currentIndex;

              let btnClass = 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700';
              if (hasChosen) {
                btnClass = 'bg-blue-600 text-white border-blue-600 font-bold';
              }
              if (isCurrent) {
                btnClass += ' ring-2 ring-amber-400 ring-offset-2 dark:ring-offset-slate-900';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    setCurrentIndex(idx);
                    syncDraft(answers, idx);
                  }}
                  className={`h-9 rounded-xl text-xs font-bold font-mono tabular-nums flex items-center justify-center transition-all active:scale-95 ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {unansweredCount > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>Còn {unansweredCount} câu chưa chọn đáp án.</span>
            </div>
          )}
        </div>
      </div>

      {/* Xác nhận nộp bài khi còn câu trống */}
      {showSubmitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận nộp bài thi thử cấp tốc"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h4 className="text-lg font-bold text-slate-900 dark:text-white">
              Bạn còn {unansweredCount} câu chưa trả lời
            </h4>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Các câu bỏ trống sẽ được tính là sai. Bạn có chắc chắn muốn nộp bài thi thử #{examNumber} ngay bây giờ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={executeSubmit}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
