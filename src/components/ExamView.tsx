import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { QuestionCard } from './QuestionCard';
import { EXAM_MODE_POLICY } from '../types/quiz';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Grid,
  Send,
  X
} from 'lucide-react';

export const ExamView: React.FC = () => {
  const {
    activeSession,
    questions,
    recordExamAnswer,
    submitExam,
    cancelActiveSession
  } = useApp();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showSubmitModal, setShowSubmitModal] = useState<boolean>(false);
  const [showSheetDrawer, setShowSheetDrawer] = useState<boolean>(false);

  // Question lookup
  const qMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);

  const examQuestions = useMemo(() => {
    if (!activeSession) return [];
    return activeSession.questionIds.map(qid => qMap.get(qid)!).filter(Boolean);
  }, [activeSession, qMap]);

  const startedAtMs = activeSession ? new Date(activeSession.startedAt).getTime() : 0;
  const allocatedSec = activeSession?.allocatedDurationSeconds ?? 1200;
  const sessionId = activeSession?.examId;
  const isSubmitted = activeSession?.isSubmitted;

  // Timer logic: Wall-clock calculation không phụ thuộc vào các mutation của selected answers
  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => {
    if (!activeSession) return 1200;
    const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
    return Math.max(0, allocatedSec - elapsed);
  });

  const hasAutoSubmitted = useRef(false);

  useEffect(() => {
    if (!sessionId || isSubmitted) return;

    const updateRemaining = () => {
      const elapsed = Math.floor((Date.now() - startedAtMs) / 1000);
      const left = Math.max(0, allocatedSec - elapsed);
      setRemainingSeconds(left);
      if (left <= 0) {
        if (!hasAutoSubmitted.current) {
          hasAutoSubmitted.current = true;
          submitExam();
        }
      }
    };

    updateRemaining();
    const timer = setInterval(updateRemaining, 1000);

    return () => clearInterval(timer);
  }, [sessionId, isSubmitted, startedAtMs, allocatedSec, submitExam]);

  // Keyboard navigation (ArrowLeft / ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [examQuestions.length]);

  if (!activeSession || examQuestions.length === 0) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <p className="text-base text-slate-600 dark:text-slate-400 font-medium">Không có bài thi nào đang diễn ra.</p>
        <button
          onClick={() => cancelActiveSession()}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const currentQ = examQuestions[currentIndex];
  const selectedOptId = activeSession.answers[currentQ?.id];

  // Count answered
  const answeredCount = Object.values(activeSession.answers).filter(v => v !== undefined).length;
  const unansweredCount = examQuestions.length - answeredCount;

  // Format time mm:ss
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isTimeCritical = remainingSeconds <= 180; // Dưới 3 phút

  // Trạng thái Tự động chuyển câu (lưu localStorage)
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

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const handleSelectOption = (optId: number) => {
    if (!currentQ) return;
    recordExamAnswer(currentQ.id, optId);

    // Tự động chuyển sang câu tiếp theo sau 250ms nếu bật autoAdvance
    if (autoAdvance && currentIndex < examQuestions.length - 1) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1));
      }, 250);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 animate-fade-in">
      {/* 1. Exam Header Bar */}
      <div className="sticky top-2 sm:top-3 z-30 bg-white/95 dark:bg-[#121826]/95 backdrop-blur p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <span>{activeSession.title}</span>
            <span className="text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              Hạng B (30 câu)
            </span>
          </h2>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Đã làm: <strong className="text-slate-900 dark:text-white font-mono">{answeredCount}</strong>/30 câu
          </div>
        </div>

        {/* Timer & Buttons */}
        <div className="flex items-center gap-2">
          {/* Countdown timer */}
          <div
            aria-label={`Thời gian làm bài còn lại: ${formattedTime}`}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl font-mono tabular-nums font-bold text-sm sm:text-base tracking-wide ${
              isTimeCritical
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            <span>{formattedTime}</span>
          </div>

          <button
            type="button"
            aria-label="Xem phiếu trả lời trắc nghiệm"
            aria-expanded={showSheetDrawer}
            aria-haspopup="dialog"
            onClick={() => setShowSheetDrawer(true)}
            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Phiếu trả lời"
          >
            <Grid className="w-5 h-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 active:scale-[0.97] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Nộp bài</span>
          </button>
        </div>
      </div>

      {/* 2. Question Sheet Drawer Modal */}
      {showSheetDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Phiếu làm bài 30 câu"
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        >
          <div className="w-full sm:max-w-xl bg-white dark:bg-[#121826] rounded-t-2xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Phiếu làm bài (30 câu)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Đã làm: {answeredCount}/30 • Chưa làm: {unansweredCount}
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng phiếu làm bài"
                onClick={() => setShowSheetDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
              {examQuestions.map((q, idx) => {
                const isAnswered = activeSession.answers[q.id] !== undefined;
                const isCurrent = idx === currentIndex;
                return (
                  <button
                    type="button"
                    key={q.id}
                    aria-label={`Câu ${idx + 1}${isAnswered ? ' (Đã chọn)' : ' (Chưa chọn)'}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowSheetDrawer(false);
                    }}
                    className={`h-11 rounded-2xl text-xs font-mono tabular-nums font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isCurrent
                        ? 'ring-2 ring-blue-600 bg-blue-600 text-white shadow-md'
                        : isAnswered
                        ? 'bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200 border border-blue-300/40 dark:border-blue-500/30'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/50 hover:scale-105'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 2.5. Tool bar: Gợi ý phím tắt & Toggle tự động chuyển câu */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="hidden sm:inline-flex items-center gap-1.5">
          Phím tắt: dùng <kbd className="font-mono px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">←</kbd> <kbd className="font-mono px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">→</kbd> để chuyển câu
        </span>
        <button
          type="button"
          onClick={toggleAutoAdvance}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ml-auto ${
            autoAdvance
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30'
              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }`}
          title="Tự động chuyển sang câu tiếp theo sau khi chọn đáp án"
        >
          <span className={`w-2 h-2 rounded-full ${autoAdvance ? 'bg-blue-600 dark:bg-blue-400' : 'bg-slate-400'}`} />
          <span>Tự động chuyển câu: {autoAdvance ? 'BẬT' : 'TẮT'}</span>
        </button>
      </div>

      {/* 3. Question Card (Blind-to-Critical: EXAM_MODE_POLICY strictly enforced) */}
      {currentQ && (
        <div className="space-y-4">
          <QuestionCard
            question={currentQ}
            policy={EXAM_MODE_POLICY}
            selectedOptionId={selectedOptId}
            onSelectOption={handleSelectOption}
            showIndex={currentIndex + 1}
            totalInList={examQuestions.length}
          />

          {/* Nav Controls */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              title="Phím mũi tên trái (←)"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-[0.97] shadow-sm touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Câu trước</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-400">←</kbd>
            </button>

            <span className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
              {currentIndex + 1} / {examQuestions.length}
            </span>

            <button
              type="button"
              onClick={() => setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1))}
              disabled={currentIndex === examQuestions.length - 1}
              title="Phím mũi tên phải (→)"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 dark:hover:bg-slate-100 transition active:scale-[0.97] shadow-sm touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
            >
              <span>Câu tiếp</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded">→</kbd>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Submit Confirmation Modal */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xác nhận nộp bài thi"
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="max-w-md w-full bg-white dark:bg-[#121826] p-6 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-5">
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              Xác nhận nộp bài thi?
            </h3>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-2 text-sm">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Số câu đã trả lời:</span>
                <strong className="text-blue-600 dark:text-blue-400 font-mono tabular-nums">{answeredCount} / 30 câu</strong>
              </div>
              {unansweredCount > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>Số câu chưa trả lời:</span>
                  <strong className="font-mono tabular-nums">{unansweredCount} câu</strong>
                </div>
              )}
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Thời gian còn lại:</span>
                <strong className="font-mono tabular-nums">{formattedTime}</strong>
              </div>
            </div>

            {unansweredCount > 0 && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/40 p-3 rounded-xl">
                Lưu ý: Các câu chưa trả lời sẽ được tính là sai. Bạn có chắc chắn muốn nộp bài ngay bây giờ?
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowSubmitModal(false);
                  await submitExam();
                }}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 active:scale-95 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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

