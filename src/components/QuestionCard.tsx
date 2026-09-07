import React, { useState } from 'react';
import type { Question, ExamModePolicy, UserProgressItem } from '../types/quiz';
import { Bookmark, Check, X, AlertTriangle, Maximize2 } from 'lucide-react';

interface QuestionCardProps {
  question: Question;
  policy: ExamModePolicy;
  selectedOptionId?: number;
  onSelectOption: (optionId: number) => void;
  progress?: UserProgressItem;
  onToggleBookmark?: () => void;
  showIndex?: number;
  totalInList?: number;
  showImmediateAnswer?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  policy,
  selectedOptionId,
  onSelectOption,
  progress,
  onToggleBookmark,
  showIndex,
  totalInList,
  showImmediateAnswer = false
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const isAnswered = selectedOptionId !== undefined;
  const isBookmarked = progress?.isBookmarked || false;

  const correctOption = question.options.find(o => o.isCorrect);

  const getOptionClasses = (optId: number) => {
    const isSelected = selectedOptionId === optId;

    // Trong Exam Mode: Chỉ thể hiện trạng thái đã chọn hay chưa (Blind-to-critical)
    if (!policy.showExplanation) {
      if (isSelected) {
        return 'border-blue-600 dark:border-blue-500 bg-blue-50/90 dark:bg-blue-500/15 text-blue-950 dark:text-blue-100 ring-2 ring-blue-500/40 shadow-sm';
      }
      return 'border-slate-200/90 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50';
    }

    // Khi bật tính năng "Hiện sẵn đáp án" (Quick study / Học nhanh)
    if (showImmediateAnswer) {
      if (optId === correctOption?.id) {
        return 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm';
      }
      if (isAnswered && isSelected && optId !== correctOption?.id) {
        return 'border-rose-500 bg-rose-50/90 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/40 shadow-sm';
      }
      return 'border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 opacity-80 hover:opacity-100';
    }

    // Trong Practice Mode thông thường: Hiển thị phản hồi đúng/sai sau khi chọn
    if (isAnswered) {
      if (optId === correctOption?.id) {
        return 'border-emerald-500 bg-emerald-50/90 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-100 ring-2 ring-emerald-500/40 shadow-sm';
      }
      if (isSelected && optId !== correctOption?.id) {
        return 'border-rose-500 bg-rose-50/90 dark:bg-rose-500/15 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/40 shadow-sm';
      }
      return 'border-slate-200 dark:border-slate-800/60 opacity-60 text-slate-500 dark:text-slate-400 dark:bg-slate-900/20';
    }

    return 'border-slate-200/90 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100/50 dark:hover:bg-slate-800/50';
  };

  return (
    <div className="bg-white dark:bg-[#121826] rounded-2xl p-3.5 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 transition-colors">
      {/* Top Header Information */}
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          {/* Question Index Badge */}
          <span className="font-extrabold text-slate-900 dark:text-white text-sm sm:text-base tracking-tight shrink-0">
            {showIndex !== undefined ? `Câu ${showIndex}` : `Câu ${question.questionNumber}`}
            {totalInList !== undefined && (
              <span className="text-slate-400 dark:text-slate-500 font-normal text-[11px] sm:text-xs ml-0.5 font-mono tabular-nums">
                /{totalInList}
              </span>
            )}
          </span>

          {/* Blind-to-critical: Chỉ hiển thị nhãn khi policy cho phép (Practice mode) */}
          {policy.showCriticalBadge && question.isCritical && (
            <span className="inline-flex items-center gap-1 text-[11px] sm:text-xs px-2 py-0.5 rounded-lg font-bold bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 shrink-0">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              <span>Điểm liệt</span>
            </span>
          )}

          {/* Chapter Category Pill: Mobile chỉ hiện 'Chương X', desktop hiện tên đầy đủ */}
          <span
            className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-lg font-medium bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50 shrink-0 max-w-[200px] truncate"
            title={question.chapterName}
          >
            <span className="sm:hidden">Chương {question.chapterId}</span>
            <span className="hidden sm:inline">{question.chapterName}</span>
          </span>

          {progress && progress.status === 'mastered' && (
            <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 rounded-lg font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 shrink-0">
              ✓ Thành thạo
            </span>
          )}
        </div>

        {onToggleBookmark && (
          <button
            type="button"
            onClick={onToggleBookmark}
            className={`p-1.5 sm:p-2 rounded-xl transition active:scale-90 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isBookmarked
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
            title={isBookmarked ? 'Bỏ đánh dấu câu hỏi' : 'Lưu câu hỏi này để ôn sau'}
            aria-label={isBookmarked ? 'Bỏ đánh dấu câu hỏi này' : 'Đánh dấu câu hỏi này'}
            aria-pressed={isBookmarked}
          >
            <Bookmark className={`w-4 h-4 sm:w-5 sm:h-5 ${isBookmarked ? 'fill-current' : ''}`} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Question Content */}
      <h3 className="text-sm sm:text-lg font-semibold text-slate-900 dark:text-slate-100 leading-snug sm:leading-relaxed tracking-tight mb-3 sm:mb-5">
        {question.content}
      </h3>

      {/* Image if any */}
      {question.image && (
        <div className="mb-4 sm:mb-6 relative group">
          <button
            type="button"
            onClick={() => setIsZoomed(true)}
            aria-label="Xem ảnh phóng to"
            className="w-full cursor-zoom-in rounded-xl sm:rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2 sm:p-3 max-h-60 sm:max-h-80 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <img
              src={`/images/${question.image.src}`}
              alt={`Hình ảnh minh họa cho câu ${question.questionNumber}`}
              className="max-h-56 sm:max-h-72 w-auto object-contain transition-transform group-hover:scale-[1.02] duration-200"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 bg-slate-950/70 text-white p-1.5 rounded-lg opacity-80 group-hover:opacity-100 transition-opacity">
              <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
            </div>
          </button>
        </div>
      )}

      {/* Modal Lightbox for Zoomed Image */}
      {isZoomed && question.image && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hình ảnh phóng to"
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              aria-label="Đóng ảnh phóng to"
              onClick={() => setIsZoomed(false)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X className="w-6 h-6" aria-hidden="true" />
            </button>
            <img
              src={`/images/${question.image.src}`}
              alt={`Hình ảnh minh họa phóng to câu ${question.questionNumber}`}
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
              decoding="async"
            />
          </div>
        </div>
      )}

      {/* Options List */}
      <div className="space-y-2 sm:space-y-3" role="radiogroup" aria-label={`Các phương án trả lời câu ${question.questionNumber}`}>
        {question.options.map((option) => {
          const isSelected = selectedOptionId === option.id;
          const isCorrect = option.id === correctOption?.id;

          return (
            <button
              type="button"
              role="radio"
              aria-checked={isSelected}
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`w-full text-left p-3 sm:p-4 rounded-xl sm:rounded-2xl border text-xs sm:text-base cursor-pointer flex items-start gap-2.5 sm:gap-3.5 transition-all select-none active:scale-[0.99] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${getOptionClasses(
                option.id
              )}`}
            >
              {/* Option Number / Badge Indicator */}
              <div
                aria-hidden="true"
                className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg sm:rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs mt-0.5 transition-colors ${
                  policy.showExplanation && (isAnswered || showImmediateAnswer)
                    ? isCorrect
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                      : isSelected
                      ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30'
                      : 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-slate-800'
                    : isSelected
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                {policy.showExplanation && (isAnswered || showImmediateAnswer) ? (
                  isCorrect ? <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : isSelected ? <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : option.id
                ) : (
                  option.id
                )}
              </div>

              {/* Option Text */}
              <div className="flex-1 leading-snug sm:leading-relaxed pt-0.5">
                {option.text}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation Block: ẩn khi bật hiện sẵn đáp án (học nhanh), giữ lại khi người dùng tự trả lời */}
      {policy.showExplanation && isAnswered && !showImmediateAnswer && (
        <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 text-sm animate-slide-up space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedOptionId === correctOption?.id ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>Chính xác! (+1 lần thành thạo)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                  <X className="w-4 h-4" aria-hidden="true" />
                  <span>Chưa đúng! Đáp án đúng là số {correctOption?.id}</span>
                </span>
              )}
            </div>

            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              Trang {question.source.page}
            </span>
          </div>

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-xs sm:text-sm">
            {question.explanation || `Căn cứ theo tài liệu 600 câu hỏi sát hạch Cục CSGT (CV 2262/CSGT-P5, Trang ${question.source.page}).`}
          </p>
        </div>
      )}
    </div>
  );
};
