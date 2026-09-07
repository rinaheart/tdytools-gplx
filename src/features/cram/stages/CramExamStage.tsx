import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Question, ExamProfile, ExamRecord, ActiveExamSession } from '../../../types/quiz';
import type { CramSession } from '../../../types/cram';
import { generateExam } from '../../../services/examEngine';
import { submitExamAtomically } from '../../../services/attemptService';
import { Clock, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react';

interface CramExamStageProps {
  examNumber: 1 | 2;
  session: CramSession;
  questions: Question[];
  profile: ExamProfile;
  onExamComplete: (record: ExamRecord) => void;
}

export const CramExamStage: React.FC<CramExamStageProps> = ({
  examNumber,
  session,
  questions,
  profile,
  onExamComplete
}) => {
  // Sinh đề dựa vào seed xác định từ session
  const seed = examNumber === 1 ? session.exam1Seed : session.exam2Seed;

  const examQuestionIds = useMemo(() => {
    return generateExam(profile, questions, seed);
  }, [profile, questions, seed]);

  const questionMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);
  const examQuestions = useMemo(
    () => examQuestionIds.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined),
    [examQuestionIds, questionMap]
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hard deadline 20 phút = 1200 giây
  const examAllocatedSeconds = 1200;
  const startedAtRef = useRef(new Date());
  const answersRef = useRef<Record<string, number | undefined>>(answers);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const [remainingSeconds, setRemainingSeconds] = useState(examAllocatedSeconds);

  // Countdown timer cho bài thi (Hard deadline theo wall-clock)
  useEffect(() => {
    if (session.isPaused) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000);
      const left = Math.max(0, examAllocatedSeconds - elapsed);
      setRemainingSeconds(left);
      if (left <= 0) {
        handleAutoSubmit();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session.isPaused]);

  // Điều hướng bằng phím mũi tên trái/phải (ArrowLeft / ArrowRight)
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

  const currentQ = examQuestions[currentIndex];

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

  const handleSelectOption = (optionId: number) => {
    if (!currentQ || isSubmitting) return;
    const isUnselecting = answers[currentQ.id] === optionId;
    setAnswers(prev => ({
      ...prev,
      [currentQ.id]: isUnselecting ? undefined : optionId
    }));

    // Tự động chuyển sang câu tiếp theo sau 250ms nếu bật autoAdvance
    if (autoAdvance && !isUnselecting && currentIndex < examQuestions.length - 1) {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = setTimeout(() => {
        setCurrentIndex(prev => Math.min(examQuestions.length - 1, prev + 1));
      }, 250);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const completedAt = new Date();
    const currentAnswers = answersRef.current;

    const activeSessionStub: ActiveExamSession = {
      examId: `cram_exam_${examNumber}_${session.id}`,
      profileId: profile.id,
      title: `Thi Thử Cấp Tốc #${examNumber} (30 câu)`,
      questionBankVersionId: profile.questionBankVersionId,
      questionIds: examQuestionIds,
      startedAt: startedAtRef.current.toISOString(),
      allocatedDurationSeconds: examAllocatedSeconds,
      answers: currentAnswers,
      isSubmitted: true
    };

    // Nộp bài thi nguyên tử (atomic transaction): ExamRecord + AttemptRecords + UserProgress
    const record = await submitExamAtomically({
      activeSession: activeSessionStub,
      profile,
      questions,
      completedAt: completedAt.toISOString(),
      mode: 'cram-120',
      examType: 'random',
      cramSessionId: session.id
    });

    // Chuyển kết quả sang stage tiếp theo
    onExamComplete(record);
  };

  const handleAutoSubmit = async () => {
    await handleFinalSubmit();
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const answeredCount = Object.values(answers).filter(v => v !== undefined).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4 animate-fade-in">
      {/* Exam Header Bar */}
      <div className="bg-slate-900 dark:bg-[#121826] text-white p-4 rounded-2xl border border-slate-800 shadow-sm flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase font-bold text-amber-400 tracking-wider">
            {examNumber === 1 ? 'Bài Thi Thử Chẩn Đoán #1' : 'Bài Thi Thử Kiểm Chứng #2'}
          </div>
          <h3 className="text-base font-bold text-white">
            30 Câu Sát Hạch • Đạt ≥ 27 & 0 Sai Điểm Liệt
          </h3>
        </div>

        {/* Đồng hồ thi riêng biệt */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800/90 dark:bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl font-mono text-sm font-bold text-amber-400">
            <Clock className="w-4 h-4" />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition"
          >
            Nộp bài
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Cột trái: Câu hỏi hiện tại (8 Cột) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Câu {currentIndex + 1} / 30
            </span>
            <div className="flex items-center gap-3">
              <span>Đã làm: <strong className="font-mono text-slate-900 dark:text-white">{answeredCount}</strong>/30 câu</span>
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
          </div>

          {currentQ && (
            <>
              {/* Nội dung câu hỏi (Blind-to-critical: Không hiện nhãn điểm liệt) */}
              <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                {currentQ.content}
              </h4>

              {/* Hình nếu có */}
              {currentQ.image && (
                <div className="my-3 flex justify-center bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 max-h-64 overflow-hidden">
                  <img
                    src={currentQ.image.src.startsWith('/') ? currentQ.image.src : `/images/${currentQ.image.src}`}
                    alt={`Hình minh họa câu ${currentQ.questionNumber}`}
                    className="max-h-60 object-contain rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}

              {/* Danh sách lựa chọn */}
              <div className="space-y-2.5 pt-1">
                {currentQ.options.map(option => {
                  const isSelected = answers[currentQ.id] === option.id;

                  return (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-500/15 text-blue-950 dark:text-blue-200 font-semibold shadow-sm'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#151c2d] text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        {option.id}
                      </span>
                      <span className="text-xs sm:text-sm leading-relaxed">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Điều hướng trước / sau */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex(prev => prev - 1)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Phím mũi tên trái (←)"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Câu trước</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-400">←</kbd>
                </button>

                <button
                  type="button"
                  disabled={currentIndex === examQuestions.length - 1}
                  onClick={() => setCurrentIndex(prev => prev + 1)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Phím mũi tên phải (→)"
                >
                  <span>Câu sau</span>
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded">→</kbd>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </div>

        {/* Cột phải: Lưới 30 câu hỏi (4 Cột) */}
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
                  onClick={() => setCurrentIndex(idx)}
                  className={`h-9 rounded-xl text-xs font-bold flex items-center justify-center transition-all active:scale-95 ${btnClass}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {answeredCount < 30 && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px]">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-500" />
              <span>Còn {30 - answeredCount} câu chưa chọn đáp án.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
