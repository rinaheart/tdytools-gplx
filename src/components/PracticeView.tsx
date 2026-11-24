import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { QuestionCard } from './QuestionCard';
import { PRACTICE_MODE_POLICY } from '../types/quiz';
import {
  AlertTriangle,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Grid,
  SlidersHorizontal,
  X
} from 'lucide-react';

export const PracticeView: React.FC = () => {
  const {
    questions,
    chapters,
    progressMap,
    practiceFilter,
    setPracticeFilter,
    answerQuestion,
    toggleBookmark
  } = useApp();

  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showGridDrawer, setShowGridDrawer] = useState<boolean>(false);
  const [showImmediateAnswer, setShowImmediateAnswer] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gplx_show_immediate_answer') === 'true';
    } catch {
      return false;
    }
  });

  const toggleImmediateAnswer = () => {
    setShowImmediateAnswer(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gplx_show_immediate_answer', String(next));
      } catch {}
      return next;
    });
  };

  const [isFilterCollapsed, setIsFilterCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gplx_filter_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleFilterCollapse = () => {
    setIsFilterCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gplx_filter_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (practiceFilter.chapterId && q.chapterId !== practiceFilter.chapterId) {
        return false;
      }
      if (practiceFilter.criticalOnly && !q.isCritical) {
        return false;
      }
      if (practiceFilter.bookmarkedOnly) {
        const prog = progressMap.get(q.id);
        if (!prog || !prog.isBookmarked) return false;
      }
      if (practiceFilter.status && practiceFilter.status !== 'all') {
        const prog = progressMap.get(q.id);
        const currentStatus = prog ? prog.status : 'unseen';
        if (currentStatus !== practiceFilter.status) return false;
      }
      return true;
    });
  }, [questions, practiceFilter, progressMap]);

  const safeIndex = Math.min(Math.max(0, currentIndex), Math.max(0, filteredQuestions.length - 1));
  const currentQuestion = filteredQuestions[safeIndex];
  const currentProgress = currentQuestion ? progressMap.get(currentQuestion.id) : undefined;

  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});

  const handleSelectOption = (optId: number) => {
    if (!currentQuestion) return;
    // Chống click đúp cùng một phương án làm cộng dồn sai lệch consecutiveCorrect
    if (selectedOptions[currentQuestion.id] === optId) return;

    const alreadyAnsweredInView = selectedOptions[currentQuestion.id] !== undefined;
    setSelectedOptions(prev => ({
      ...prev,
      [currentQuestion.id]: optId
    }));

    // Chỉ ghi nhận attempt lần đầu trả lời câu này trong lượt xem hiện tại
    if (!alreadyAnsweredInView) {
      answerQuestion(currentQuestion.id, optId, { mode: 'practice' });
    }
  };

  const handleNext = () => {
    if (safeIndex < filteredQuestions.length - 1) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [safeIndex, filteredQuestions.length]);

  return (
    <div className="max-w-4xl mx-auto space-y-3 sm:space-y-5 pb-16 sm:pb-20 animate-fade-in">
      {/* 1. Filter Toolbar */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all overflow-hidden">
        {isFilterCollapsed ? (
          <div className="p-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                aria-expanded={false}
                onClick={toggleFilterCollapse}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Bấm để mở rộng đầy đủ các chương và bộ lọc"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                <span className="text-blue-600 dark:text-blue-400 font-extrabold truncate max-w-[110px] sm:max-w-none">
                  {practiceFilter.chapterId ? `Chương ${practiceFilter.chapterId}` : 'Tất cả 6 chương'}
                </span>
                {practiceFilter.criticalOnly && (
                  <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                    Điểm liệt
                  </span>
                )}
                {practiceFilter.bookmarkedOnly && (
                  <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                    Đã lưu
                  </span>
                )}
                {practiceFilter.status === 'review' && (
                  <span className="bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                    Cần ôn
                  </span>
                )}
                {practiceFilter.status === 'unseen' && (
                  <span className="bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded-md font-bold shrink-0">
                    Chưa học
                  </span>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-0.5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={showImmediateAnswer}
                onClick={toggleImmediateAnswer}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 border ${
                  showImmediateAnswer
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60'
                }`}
                title="Hiện sẵn đáp án đúng để học nhanh"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Hiện sẵn đáp án</span>
                <span className="sm:hidden">Học nhanh</span>
              </button>

              <button
                type="button"
                aria-expanded={showGridDrawer}
                aria-haspopup="dialog"
                aria-label="Mở mục lục danh sách câu hỏi"
                onClick={() => setShowGridDrawer(prev => !prev)}
                className="flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
                title="Mở mục lục câu hỏi"
              >
                <Grid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Mục lục ({filteredQuestions.length})</span>
                <span className="sm:hidden font-mono tabular-nums">{filteredQuestions.length}</span>
              </button>

              <button
                type="button"
                aria-expanded={false}
                onClick={toggleFilterCollapse}
                className="flex items-center gap-1 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Mở rộng bộ lọc"
              >
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Mở rộng</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:p-4 space-y-2.5 animate-fade-in">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar scroll-smooth">
              <button
                type="button"
                aria-pressed={practiceFilter.chapterId === undefined}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, chapterId: undefined }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  practiceFilter.chapterId === undefined
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                Tất cả (600)
              </button>
              {chapters.map(ch => (
                <button
                  type="button"
                  key={ch.id}
                  aria-pressed={practiceFilter.chapterId === ch.id}
                  onClick={() => {
                    setPracticeFilter(prev => ({ ...prev, chapterId: ch.id }));
                    setSelectedOptions({});
                    setCurrentIndex(0);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    practiceFilter.chapterId === ch.id
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  Chương {ch.id} ({ch.totalQuestions})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar scroll-smooth">
              <button
                type="button"
                aria-pressed={!practiceFilter.criticalOnly && !practiceFilter.bookmarkedOnly && practiceFilter.status === 'all'}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, criticalOnly: false, bookmarkedOnly: false, status: 'all' }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white ${
                  !practiceFilter.criticalOnly && !practiceFilter.bookmarkedOnly && practiceFilter.status === 'all'
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                aria-pressed={practiceFilter.criticalOnly}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, criticalOnly: true, bookmarkedOnly: false, status: 'all' }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  practiceFilter.criticalOnly
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                    : 'text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>60 Điểm liệt</span>
              </button>
              <button
                type="button"
                aria-pressed={practiceFilter.bookmarkedOnly}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, criticalOnly: false, bookmarkedOnly: true, status: 'all' }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  practiceFilter.bookmarkedOnly
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/25'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Đã lưu</span>
              </button>
              <button
                type="button"
                aria-pressed={practiceFilter.status === 'review'}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, criticalOnly: false, bookmarkedOnly: false, status: 'review' }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  practiceFilter.status === 'review'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/25'
                    : 'text-amber-700 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                }`}
              >
                Cần ôn lại
              </button>
              <button
                type="button"
                aria-pressed={practiceFilter.status === 'unseen'}
                onClick={() => {
                  setPracticeFilter(prev => ({ ...prev, criticalOnly: false, bookmarkedOnly: false, status: 'unseen' }));
                  setSelectedOptions({});
                  setCurrentIndex(0);
                }}
                className={`shrink-0 px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  practiceFilter.status === 'unseen'
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                    : 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                Chưa học
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  role="switch"
                  aria-checked={showImmediateAnswer}
                  onClick={toggleImmediateAnswer}
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 border ${
                    showImmediateAnswer
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/25'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200/60 dark:border-slate-700/60'
                  }`}
                  title="Hiện sẵn đáp án đúng để học nhanh"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="hidden sm:inline">Hiện sẵn đáp án</span>
                  <span className="sm:hidden">Học nhanh</span>
                </button>

                <button
                  type="button"
                  aria-expanded={showGridDrawer}
                  aria-haspopup="dialog"
                  aria-label="Mở mục lục danh sách câu hỏi"
                  onClick={() => setShowGridDrawer(prev => !prev)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700/60 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
                >
                  <Grid className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>Mục lục ({filteredQuestions.length})</span>
                </button>
              </div>

              <button
                type="button"
                aria-expanded={true}
                onClick={toggleFilterCollapse}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title="Thu gọn bộ lọc để tập trung tối đa vào câu hỏi"
              >
                <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Thu gọn</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid Drawer Modal */}
      {showGridDrawer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Mục lục câu hỏi (${filteredQuestions.length} câu)`}
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
        >
          <div className="w-full sm:max-w-2xl bg-white dark:bg-[#121826] rounded-t-3xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h4 className="font-bold text-base text-slate-900 dark:text-white">
                  Danh sách câu hỏi ({filteredQuestions.length} câu)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Xanh lá: Thành thạo • Xanh dương: Đang học • Đỏ: Cần ôn • Xám: Chưa học
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng mục lục câu hỏi"
                onClick={() => setShowGridDrawer(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 overflow-y-auto p-1 flex-1">
              {filteredQuestions.map((q, idx) => {
                const p = progressMap.get(q.id);
                const isCur = idx === safeIndex;
                let bg = 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50';
                if (p?.status === 'mastered') bg = 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300/40 dark:border-emerald-500/30';
                else if (p?.status === 'review') bg = 'bg-rose-100 dark:bg-rose-500/20 text-rose-800 dark:text-rose-300 font-bold border border-rose-300/40 dark:border-rose-500/30';
                else if (p?.status === 'learning') bg = 'bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-300 font-bold border border-blue-300/40 dark:border-blue-500/30';

                return (
                  <button
                    type="button"
                    key={q.id}
                    aria-label={`Câu ${q.questionNumber}${q.isCritical ? ' (Điểm liệt)' : ''}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setShowGridDrawer(false);
                    }}
                    className={`h-9 rounded-xl text-xs font-mono tabular-nums font-bold flex items-center justify-center transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${bg} ${
                      isCur ? 'ring-2 ring-blue-600 font-black scale-105 z-10 shadow-md' : 'hover:scale-105'
                    }`}
                  >
                    {q.questionNumber}
                    {q.isCritical && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white dark:border-[#121826]" aria-hidden="true"></span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Question Card & Controls */}
      {currentQuestion ? (
        <div className="space-y-4">
          <QuestionCard
            question={currentQuestion}
            policy={PRACTICE_MODE_POLICY}
            selectedOptionId={selectedOptions[currentQuestion.id]}
            onSelectOption={handleSelectOption}
            progress={currentProgress}
            onToggleBookmark={() => toggleBookmark(currentQuestion.id)}
            showIndex={safeIndex + 1}
            totalInList={filteredQuestions.length}
            showImmediateAnswer={showImmediateAnswer}
          />

          <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1 sm:pt-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={safeIndex === 0}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-[0.98] shadow-sm touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Câu trước</span>
            </button>

            <div className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
              {safeIndex + 1} / {filteredQuestions.length}
            </div>

            <button
              type="button"
              onClick={handleNext}
              disabled={safeIndex === filteredQuestions.length - 1}
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-4.5 py-2.5 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.98] shadow-md shadow-blue-600/20 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>Câu tiếp</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121826] p-12 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
          <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
            Không tìm thấy câu hỏi nào phù hợp với bộ lọc hiện tại.
          </p>
          <button
            type="button"
            onClick={() => setPracticeFilter({ status: 'all' })}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}
    </div>
  );
};
