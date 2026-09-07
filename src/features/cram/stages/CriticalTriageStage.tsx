import React, { useState } from 'react';
import type { Question } from '../../../types/quiz';
import type { CramSession } from '../../../types/cram';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Sparkles } from 'lucide-react';

interface CriticalTriageStageProps {
  questions: Question[];
  session: CramSession;
  onRecordAnswer: (questionId: string, isCorrect: boolean) => void;
  onCompleteStage: (mistakeIds: string[], answeredIds: string[]) => void;
}

export const CriticalTriageStage: React.FC<CriticalTriageStageProps> = ({
  questions,
  session,
  onRecordAnswer,
  onCompleteStage
}) => {
  const criticalQuestions = React.useMemo(() => questions.filter(q => q.isCritical), [questions]);
  const totalQuestions = criticalQuestions.length;

  // Khôi phục vị trí câu hỏi từ snapshot triageAnsweredIds
  const [currentIndex, setCurrentIndex] = useState(() => {
    const answeredCount = session.triageAnsweredIds.length;
    return answeredCount < totalQuestions ? answeredCount : totalQuestions - 1;
  });

  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [mistakeIds, setMistakeIds] = useState<string[]>(() => [...session.triageMistakeIds]);
  const [answeredIds, setAnsweredIds] = useState<string[]>(() => [...session.triageAnsweredIds]);
  const [isFinished, setIsFinished] = useState(() => session.triageAnsweredIds.length >= totalQuestions);

  const currentQ = criticalQuestions[currentIndex];

  const handleSelectOption = (optionId: number) => {
    if (selectedOptionId !== null || !currentQ) return;

    setSelectedOptionId(optionId);
    const chosenOption = currentQ.options.find(o => o.id === optionId);
    const isCorrect = chosenOption?.isCorrect ?? false;

    // Cập nhật local state
    const newAnswered = Array.from(new Set([...answeredIds, currentQ.id]));
    setAnsweredIds(newAnswered);

    let newMistakes = [...mistakeIds];
    if (!isCorrect) {
      newMistakes = Array.from(new Set([...mistakeIds, currentQ.id]));
      setMistakeIds(newMistakes);
    }

    // Tác động ngược vào UserProgress
    onRecordAnswer(currentQ.id, isCorrect);

    // Chờ 500ms chuyển câu tự động hoặc cho bấm tiếp theo
    setTimeout(() => {
      if (currentIndex + 1 < totalQuestions) {
        setCurrentIndex(prev => prev + 1);
        setSelectedOptionId(null);
      } else {
        setIsFinished(true);
      }
    }, 600);
  };

  const handleManualNext = () => {
    if (currentIndex + 1 < totalQuestions) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
    } else {
      setIsFinished(true);
    }
  };

  if (isFinished) {
    const correctCount = totalQuestions - mistakeIds.length;
    const accuracy = Math.round((correctCount / totalQuestions) * 100);

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in text-center py-6">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
          <Sparkles className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Hoàn Thành Chẩn Đoán 60 Câu Điểm Liệt
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Giai đoạn chẩn đoán tốc độ cao đã khép lại. Hệ thống đã lập danh sách các câu cần vá lỗi cấp tốc.
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
            onClick={() => onCompleteStage(mistakeIds, answeredIds)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 active:scale-95 transition"
          >
            <span>Chuyển sang Giai đoạn 2: Sửa lỗi điểm liệt</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Top Banner Triage */}
      <div className="flex items-center justify-between bg-white dark:bg-[#121826] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs">
          <ShieldAlert className="w-4 h-4" />
          <span>Chẩn đoán nhanh • 60 Câu Điểm Liệt</span>
        </div>
        <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          Câu {currentIndex + 1} / {totalQuestions}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-rose-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Câu {currentQ.questionNumber} • Điểm liệt</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Sai hiện tại: <strong className="text-rose-500">{mistakeIds.length}</strong>
          </div>
        </div>

        {/* Nội dung câu hỏi */}
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {currentQ.content}
        </h3>

        {/* Hình ảnh nếu có */}
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

        {/* Danh sách phương án chọn (UX siêu tốc) */}
        <div className="space-y-2.5 pt-1">
          {currentQ.options.map(option => {
            const isSelected = selectedOptionId === option.id;
            const hasAnswered = selectedOptionId !== null;

            let optionStyle = 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-[#151c2d]';

            if (hasAnswered) {
              if (option.isCorrect) {
                optionStyle = 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (isSelected) {
                optionStyle = 'border-rose-500 bg-rose-50/70 dark:bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold';
              } else {
                optionStyle = 'border-slate-100 dark:border-slate-800/40 opacity-40';
              }
            }

            return (
              <button
                type="button"
                key={option.id}
                onClick={() => handleSelectOption(option.id)}
                disabled={hasAnswered}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    hasAnswered && option.isCorrect
                      ? 'bg-emerald-500 text-white'
                      : hasAnswered && isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {option.id}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed">{option.text}</span>
                </div>

                {hasAnswered && option.isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
                {hasAnswered && isSelected && !option.isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Nút manual next nếu muốn sang nhanh */}
        {selectedOptionId !== null && (
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleManualNext}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-95"
            >
              <span>Câu tiếp</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
