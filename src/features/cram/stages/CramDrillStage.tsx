import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Question, UserProgressItem } from '../../../types/quiz';
import type { CramSession } from '../../../types/cram';
import { PRACTICE_MODE_POLICY } from '../../../types/quiz';
import { getCramDrillQuestions } from '../../../services/cramEngine';
import { QuestionCard } from '../../../components/QuestionCard';
import {
  ShieldAlert,
  ShieldCheck,
  Target,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export type CramDrillMode = 'critical-triage' | 'critical-repair' | 'weakness-sprint' | 'final-check';

interface CramDrillStageProps {
  mode: CramDrillMode;
  questions: Question[];
  progressMap: Map<string, UserProgressItem>;
  session: CramSession;
  onRecordAnswer: (questionId: string, selectedOptionId: number) => void;
  onPersistSession: (patch: Partial<CramSession>) => void;
  onCompleteStage: (payload: { mistakeIds: string[]; answeredIds: string[] }) => void;
}

const STAGE_UI_CONFIG: Record<
  CramDrillMode,
  {
    bannerTitle: string;
    bannerColor: string;
    barColor: string;
    Icon: React.ComponentType<{ className?: string }>;
    emptyTitle: string;
    emptyDesc: string;
    nextStageButton: string;
  }
> = {
  'critical-triage': {
    bannerTitle: 'Chẩn đoán nhanh • 60 Câu Điểm Liệt',
    bannerColor: 'text-rose-600 dark:text-rose-400',
    barColor: 'bg-rose-500',
    Icon: ShieldAlert,
    emptyTitle: 'Hoàn Thành Chẩn Đoán 60 Câu Điểm Liệt',
    emptyDesc: 'Hệ thống đã lập danh sách các câu điểm liệt cần củng cố cấp tốc.',
    nextStageButton: 'Chuyển sang Giai đoạn 2: Sửa lỗi điểm liệt'
  },
  'critical-repair': {
    bannerTitle: 'Sửa Lỗi Điểm Liệt • Củng Cố Đáp Án Chuẩn',
    bannerColor: 'text-amber-600 dark:text-amber-400',
    barColor: 'bg-amber-500',
    Icon: BookOpen,
    emptyTitle: 'Không Có Lỗi Điểm Liệt Tồn Đọng',
    emptyDesc: 'Bạn không mắc lỗi câu điểm liệt nào trong phần chẩn đoán. Sẵn sàng bước vào bài thi thử chuẩn số 1.',
    nextStageButton: 'Vào Thi Thử Chuẩn #1 (30 câu)'
  },
  'weakness-sprint': {
    bannerTitle: 'Sprint Vá Điểm Yếu • Tập Trung Nhóm Hay Sai',
    bannerColor: 'text-blue-600 dark:text-blue-400',
    barColor: 'bg-blue-600',
    Icon: Target,
    emptyTitle: 'Kho Câu Hỏi Điểm Yếu Đã Sạch',
    emptyDesc: 'Bạn đã xử lý tốt các nhóm chủ đề trọng tâm. Sẵn sàng bước sang bài thi thử kiểm chứng #2.',
    nextStageButton: 'Vào Bài Thi Thử Kiểm Chứng #2'
  },
  'final-check': {
    bannerTitle: 'Kiểm Tra An Toàn Cuối • Chốt Chặn Lỗi Tồn Đọng',
    bannerColor: 'text-emerald-600 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    Icon: ShieldCheck,
    emptyTitle: 'Hàng Đợi Kiểm Tra Hoàn Toàn Sạch Sẽ',
    emptyDesc: 'Không phát hiện lỗi điểm liệt hoặc câu hỏi nguy hiểm còn tồn đọng.',
    nextStageButton: 'Xem Đánh Giá Mức Độ Sẵn Sàng'
  }
};

export const CramDrillStage: React.FC<CramDrillStageProps> = ({
  mode,
  questions,
  progressMap,
  session,
  onRecordAnswer,
  onPersistSession,
  onCompleteStage
}) => {
  // Cố định danh sách câu hỏi của stage tại thời điểm mount để không bị nhảy thứ tự khi progressMap cập nhật
  const [drillQuestions] = useState<Question[]>(() =>
    getCramDrillQuestions(mode, session, questions, progressMap)
  );
  const total = drillQuestions.length;

  const [currentIndex, setCurrentIndex] = useState<number>(() => {
    if (mode === 'critical-triage') {
      const done = session.triageAnsweredIds.length;
      return done < total ? done : Math.max(0, total - 1);
    }
    return Math.min(session.stageCursor ?? 0, Math.max(0, total - 1));
  });

  const [selectedOptionId, setSelectedOptionId] = useState<number | undefined>(undefined);
  const [answeredIds, setAnsweredIds] = useState<string[]>(() =>
    mode === 'critical-triage' ? [...session.triageAnsweredIds] : []
  );
  const [mistakeIds, setMistakeIds] = useState<string[]>(() => {
    if (mode === 'critical-triage') return [...session.triageMistakeIds];
    if (mode === 'critical-repair') return drillQuestions.map(q => q.id);
    return [];
  });
  const [isTriageFinished, setIsTriageFinished] = useState<boolean>(
    () => mode === 'critical-triage' && total > 0 && session.triageAnsweredIds.length >= total
  );

  // Quản lý timer tự chuyển câu của Triage bằng ref để tránh nhảy đúp 2 câu khi bấm Next tay
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAutoTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearAutoTimer;
  }, [clearAutoTimer]);

  const currentQ = drillQuestions[currentIndex];
  const isAnswered = selectedOptionId !== undefined;
  const config = STAGE_UI_CONFIG[mode];
  const BannerIcon = config.Icon;

  const advanceOrFinish = useCallback(
    (latestMistakes: string[], latestAnswered: string[]) => {
      clearAutoTimer();
      if (currentIndex + 1 < total) {
        const nextIdx = currentIndex + 1;
        setCurrentIndex(nextIdx);
        setSelectedOptionId(undefined);
        if (mode !== 'critical-triage') {
          onPersistSession({ stageCursor: nextIdx });
        }
      } else if (mode === 'critical-triage') {
        setIsTriageFinished(true);
      } else {
        onCompleteStage({ mistakeIds: latestMistakes, answeredIds: latestAnswered });
      }
    },
    [clearAutoTimer, currentIndex, total, mode, onPersistSession, onCompleteStage]
  );

  const handleSelectOption = useCallback(
    (optionId: number) => {
      if (selectedOptionId !== undefined || !currentQ || session.isPaused) return;

      setSelectedOptionId(optionId);
      const isCorrect = currentQ.options.find(o => o.id === optionId)?.isCorrect ?? false;

      const nextAnswered = Array.from(new Set([...answeredIds, currentQ.id]));
      setAnsweredIds(nextAnswered);

      let nextMistakes = mistakeIds;
      if (mode === 'critical-triage') {
        if (!isCorrect) {
          nextMistakes = Array.from(new Set([...mistakeIds, currentQ.id]));
          setMistakeIds(nextMistakes);
        }
        onPersistSession({
          triageAnsweredIds: nextAnswered,
          triageMistakeIds: nextMistakes,
          criticalRepairRemainingIds: nextMistakes
        });
      } else if (mode === 'critical-repair') {
        if (isCorrect) {
          nextMistakes = mistakeIds.filter(id => id !== currentQ.id);
          setMistakeIds(nextMistakes);
        }
        onPersistSession({ criticalRepairRemainingIds: nextMistakes });
      } else if (mode === 'final-check') {
        if (!isCorrect) {
          nextMistakes = Array.from(new Set([...mistakeIds, currentQ.id]));
          setMistakeIds(nextMistakes);
        }
        onPersistSession({ finalCheckRemainingIds: nextMistakes });
      }

      onRecordAnswer(currentQ.id, optionId);

      // Trong Triage: tự động chuyển câu sau 550ms nếu trả lời đúng để quét nhanh; nếu sai giữ lại để học viên đọc kỹ đáp án đúng
      if (mode === 'critical-triage' && isCorrect) {
        clearAutoTimer();
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceOrFinish(nextMistakes, nextAnswered);
        }, 550);
      }
    },
    [
      selectedOptionId,
      currentQ,
      session.isPaused,
      answeredIds,
      mistakeIds,
      mode,
      onPersistSession,
      onRecordAnswer,
      clearAutoTimer,
      advanceOrFinish
    ]
  );

  const handleManualNext = useCallback(() => {
    if (!isAnswered || session.isPaused) return;
    advanceOrFinish(mistakeIds, answeredIds);
  }, [isAnswered, session.isPaused, advanceOrFinish, mistakeIds, answeredIds]);

  // Hỗ trợ phím tắt 1..4 chọn đáp án và ArrowRight / ArrowDown / Enter chuyển câu kế tiếp trên cả 4 stage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (session.isPaused || isTriageFinished || total === 0) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Enter') && isAnswered) {
        e.preventDefault();
        handleManualNext();
      } else if (!isAnswered && ['1', '2', '3', '4'].includes(e.key)) {
        const optNum = parseInt(e.key, 10);
        const opt = currentQ?.options.find(o => o.id === optNum);
        if (opt) {
          e.preventDefault();
          handleSelectOption(opt.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session.isPaused, isTriageFinished, total, isAnswered, currentQ, handleManualNext, handleSelectOption]);

  // Màn hình tổng kết Triage trước khi qua Repair
  if (mode === 'critical-triage' && isTriageFinished) {
    const correctCount = total - mistakeIds.length;
    const accuracy = total > 0 ? Math.round((correctCount / total) * 100) : 100;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center py-6">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {config.emptyTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {config.emptyDesc}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto bg-white dark:bg-[#121826] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Đúng ngay</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {correctCount}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Cần sửa lỗi</div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono">
              {mistakeIds.length}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">Độ chính xác</div>
            <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
              {accuracy}%
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => onCompleteStage({ mistakeIds, answeredIds })}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 active:scale-95 transition"
          >
            <span>{config.nextStageButton}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Hàng đợi rỗng (VD: 0 câu sai điểm liệt ở bước Repair)
  if (total === 0 || !currentQ) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-8 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            {config.emptyTitle}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {config.emptyDesc}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCompleteStage({ mistakeIds: [], answeredIds: [] })}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 active:scale-95 transition"
        >
          <span>{config.nextStageButton}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Top Stage Banner */}
      <div className="flex items-center justify-between bg-white dark:bg-[#121826] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className={`flex items-center gap-2 font-bold text-xs ${config.bannerColor}`}>
          <BannerIcon className="w-4 h-4" />
          <span>{config.bannerTitle}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono">1–4</kbd> chọn
            <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono ml-1">→</kbd> tiếp
          </span>
          <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 tabular-nums">
            Câu {currentIndex + 1} / {total}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className={`${config.barColor} h-full transition-all duration-300 rounded-full`}
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Shared QuestionCard (có Zoom Lightbox ảnh sa hình/biển báo + ARIA radiogroup chuẩn) */}
      <QuestionCard
        question={currentQ}
        policy={PRACTICE_MODE_POLICY}
        selectedOptionId={selectedOptionId}
        onSelectOption={handleSelectOption}
        progress={progressMap.get(currentQ.id)}
        showIndex={currentIndex + 1}
        totalInList={total}
        lockSelectionAfterAnswer={true}
      />

      {/* Next Action Bar */}
      {isAnswered && (
        <div className="flex justify-end pt-1 animate-fade-in">
          <button
            type="button"
            onClick={handleManualNext}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 active:scale-95 transition touch-target"
          >
            <span>{currentIndex + 1 < total ? 'Câu tiếp theo' : 'Hoàn thành giai đoạn'}</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] bg-white/20 rounded font-mono font-normal">
              →
            </kbd>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
