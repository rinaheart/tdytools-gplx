import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { calculateReviewPriorityScore } from '../services/learningEngine';
import { QuestionCard } from './QuestionCard';
import { PRACTICE_MODE_POLICY } from '../types/quiz';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  Zap
} from 'lucide-react';

export const ReviewQueueView: React.FC = () => {
  const {
    questions,
    progressMap,
    answerQuestion,
    toggleBookmark
  } = useApp();

  const [activeTab, setActiveTab] = useState<'queue' | 'practice'>('queue');
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState<number>(0);

  // Compute prioritized list
  const rankedQuestions = useMemo(() => {
    return [...questions]
      .map(q => {
        const prog = progressMap.get(q.id);
        const score = calculateReviewPriorityScore(q, prog);
        return {
          question: q,
          progress: prog,
          score
        };
      })
      .filter(item => item.score > 20) // Loại bớt câu non-critical unseen bình thường
      .sort((a, b) => b.score - a.score);
  }, [questions, progressMap]);

  const currentItem = rankedQuestions[currentPracticeIndex];

  // Keyboard navigation for practice tab
  useEffect(() => {
    if (activeTab !== 'practice') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        setCurrentPracticeIndex(prev => Math.min(rankedQuestions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPracticeIndex(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, rankedQuestions.length]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-slate-900 dark:bg-[#121826] rounded-3xl p-6 sm:p-8 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10 mb-2.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Chống trượt điểm liệt</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Danh Sách Câu Sai & Cần Ôn Tập
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl font-normal leading-relaxed">
              Tập trung xử lý triệt để: Câu điểm liệt có nguy cơ cao → Các câu từng trả lời sai trong bài thi hoặc luyện tập → Câu chưa đạt ngưỡng 3 lần đúng liên tiếp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveTab('practice');
              setCurrentPracticeIndex(0);
            }}
            disabled={rankedQuestions.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition disabled:opacity-40 touch-target flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Ôn {rankedQuestions.length} câu ưu tiên</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5" role="tablist" aria-label="Chế độ ôn tập">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'queue'}
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'queue'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Danh sách ưu tiên ({rankedQuestions.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'practice'}
          onClick={() => setActiveTab('practice')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            activeTab === 'practice'
              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Luyện tập trực tiếp
        </button>
      </div>

      {/* Tab 1: Queue List */}
      {activeTab === 'queue' && (
        <div className="space-y-2.5">
          {rankedQuestions.length > 0 ? (
            rankedQuestions.slice(0, 50).map(({ question, progress, score }, idx) => (
              <button
                type="button"
                key={question.id}
                onClick={() => {
                  setActiveTab('practice');
                  setCurrentPracticeIndex(idx);
                }}
                className="text-left w-full bg-white dark:bg-[#121826] p-4 sm:p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition flex items-center justify-between gap-3 cursor-pointer group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-xs font-mono tabular-nums flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        Câu {question.questionNumber}
                      </span>
                      {question.isCritical && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 dark:border dark:border-rose-500/30 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          Điểm liệt
                        </span>
                      )}
                      {progress?.status === 'review' && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 dark:border dark:border-amber-500/30">
                          Cần ôn lại
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {question.content}
                    </p>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-mono tabular-nums font-bold text-slate-700 dark:text-slate-300">
                    Trọng số: {score}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                    {progress ? `${progress.correctCount}/${progress.attempts} đúng` : 'Chưa làm'}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="bg-white dark:bg-[#121826] p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-sm">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Tuyệt vời! Không có câu hỏi nào cần ôn gấp.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Toàn bộ câu điểm liệt và câu trả lời sai đã được bạn hoàn toàn củng cố.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Practice directly */}
      {activeTab === 'practice' && currentItem && (
        <div className="space-y-4">
          <QuestionCard
            question={currentItem.question}
            policy={PRACTICE_MODE_POLICY}
            selectedOptionId={undefined}
            onSelectOption={(optId) => {
              const correct = currentItem.question.options.find(o => o.isCorrect);
              answerQuestion(currentItem.question.id, optId === correct?.id);
            }}
            progress={currentItem.progress}
            onToggleBookmark={() => toggleBookmark(currentItem.question.id)}
            showIndex={currentPracticeIndex + 1}
            totalInList={rankedQuestions.length}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentPracticeIndex(prev => Math.max(0, prev - 1))}
              disabled={currentPracticeIndex === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-[0.98] shadow-sm touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Câu trước</span>
            </button>
            <span className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
              {currentPracticeIndex + 1} / {rankedQuestions.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPracticeIndex(prev => Math.min(rankedQuestions.length - 1, prev + 1))}
              disabled={currentPracticeIndex === rankedQuestions.length - 1}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-[0.98] shadow-md shadow-blue-600/20 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <span>Câu tiếp</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

