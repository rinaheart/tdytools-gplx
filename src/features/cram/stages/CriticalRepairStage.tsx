import React, { useState } from 'react';
import type { Question } from '../../../types/quiz';
import type { CramSession } from '../../../types/cram';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, BookOpen } from 'lucide-react';

interface CriticalRepairStageProps {
  questions: Question[];
  session: CramSession;
  onRecordAnswer: (questionId: string, isCorrect: boolean) => void;
  onCompleteStage: (remainingMistakeIds: string[]) => void;
}

export const CriticalRepairStage: React.FC<CriticalRepairStageProps> = ({
  questions,
  session,
  onRecordAnswer,
  onCompleteStage
}) => {
  const questionMap = React.useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);

  // Danh sách câu cần sửa lỗi
  const repairQuestions = React.useMemo(() => {
    const ids = session.triageMistakeIds.length > 0
      ? session.triageMistakeIds
      : session.criticalRepairRemainingIds.slice(0, 15);

    return ids.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
  }, [session, questionMap]);

  const total = repairQuestions.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [remainingMistakeIds, setRemainingMistakeIds] = useState<string[]>(() =>
    repairQuestions.map(q => q.id)
  );

  const currentQ = repairQuestions[currentIndex];

  const handleSelectOption = (optionId: number) => {
    if (selectedOptionId !== null || !currentQ) return;

    setSelectedOptionId(optionId);
    const chosenOption = currentQ.options.find(o => o.id === optionId);
    const isCorrect = chosenOption?.isCorrect ?? false;

    // Nếu làm đúng, xóa khỏi danh sách lỗi cần sửa
    if (isCorrect) {
      setRemainingMistakeIds(prev => prev.filter(id => id !== currentQ.id));
    }

    onRecordAnswer(currentQ.id, isCorrect);
  };

  const handleNext = () => {
    if (currentIndex + 1 < total) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOptionId(null);
    } else {
      onCompleteStage(remainingMistakeIds);
    }
  };

  // Nếu không có câu sai nào cần sửa
  if (total === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-8 animate-fade-in">
        <div className="w-16 h-16 rounded-3xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
            Tuyệt Vời! Không Có Lỗi Điểm Liệt
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            Bạn đã hoàn thành 60 câu điểm liệt chẩn đoán mà không mắc lỗi nào. Sẵn sàng bước ngay vào bài thi thử chuẩn số 1.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onCompleteStage([])}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl font-bold text-sm shadow-md shadow-blue-600/25 active:scale-95 transition"
        >
          <span>Vào Thi Thử Chuẩn #1 (30 câu)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!currentQ) return null;

  const isAnswered = selectedOptionId !== null;
  const isCorrect = isAnswered && currentQ.options.find(o => o.id === selectedOptionId)?.isCorrect;

  return (
    <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-[#121826] px-4 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
          <BookOpen className="w-4 h-4" />
          <span>Sửa Lỗi Điểm Liệt • Đầy Đủ Căn Cứ Giải Thích</span>
        </div>
        <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
          Câu {currentIndex + 1} / {total}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-amber-500 h-full transition-all duration-300 rounded-full"
          style={{ width: `${((currentIndex + 1) / total) * 100}%` }}
        />
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-500/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Câu {currentQ.questionNumber} • Trọng tâm điểm liệt</span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            Còn lại: <strong className="text-amber-600 dark:text-amber-400">{remainingMistakeIds.length}</strong>
          </div>
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
          {currentQ.content}
        </h3>

        {/* Hình minh họa */}
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

        {/* Options */}
        <div className="space-y-2.5 pt-1">
          {currentQ.options.map(option => {
            const isSelected = selectedOptionId === option.id;

            let optionStyle = 'border-slate-200/80 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-[#151c2d]';

            if (isAnswered) {
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
                disabled={isAnswered}
                className={`w-full text-left p-3.5 rounded-xl border-2 transition-all flex items-center justify-between gap-3 ${optionStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 ${
                    isAnswered && option.isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isAnswered && isSelected
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}>
                    {option.id}
                  </span>
                  <span className="text-xs sm:text-sm leading-relaxed">{option.text}</span>
                </div>

                {isAnswered && option.isCorrect && (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                )}
                {isAnswered && isSelected && !option.isCorrect && (
                  <XCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Giải thích chi tiết sau khi chọn */}
        {isAnswered && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-2 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Căn cứ giải thích pháp lý</span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {currentQ.explanation || 'Đáp án đúng được căn cứ theo quy chuẩn sát hạch Cục CSGT.'}
            </p>

            <div className="text-[11px] text-slate-400 font-mono pt-1">
              Nguồn: {currentQ.source.document} (Trang {currentQ.source.page})
            </div>
          </div>
        )}

        {/* Nút Tiếp tục */}
        {isAnswered && (
          <div className="pt-3 flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80">
            <span className={`text-xs font-bold ${isCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {isCorrect ? '✓ Đã sửa đúng câu này' : '✗ Vẫn chưa chính xác, hãy ghi nhớ giải thích'}
            </span>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/20 active:scale-95 transition"
            >
              <span>{currentIndex + 1 < total ? 'Câu tiếp theo' : 'Hoàn thành sửa lỗi'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
