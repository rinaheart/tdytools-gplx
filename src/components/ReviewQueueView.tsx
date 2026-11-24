import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getQuestionsNeedingReview, calculateReviewPriorityScore } from '../services/learningEngine';
import { QuestionCard } from './QuestionCard';
import { PRACTICE_MODE_POLICY } from '../types/quiz';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
  ShieldAlert,
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
  const [includeUnseenCritical, setIncludeUnseenCritical] = useState<boolean>(false);
  const [practiceQueueIds, setPracticeQueueIds] = useState<string[]>([]);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const qMap = useMemo(() => new Map(questions.map(q => [q.id, q])), [questions]);

  const rankedQuestions = useMemo(() => {
    const candidates = getQuestionsNeedingReview(questions, progressMap, includeUnseenCritical);
    return candidates
      .map(q => {
        const prog = progressMap.get(q.id);
        const score = calculateReviewPriorityScore(q, prog);
        return { question: q, progress: prog, score };
      })
      .sort((a, b) => b.score - a.score);
  }, [questions, progressMap, includeUnseenCritical]);

  const startPracticeSession = (startIndex: number = 0) => {
    const snapshotIds = rankedQuestions.map(item => item.question.id);
    if (snapshotIds.length === 0) return;
    setPracticeQueueIds(snapshotIds);
    setSelectedAnswers({});
    setCurrentPracticeIndex(startIndex);
    setActiveTab('practice');
  };

  const activePracticeQuestions = useMemo(() => {
    const ids = practiceQueueIds.length > 0 ? practiceQueueIds : rankedQuestions.map(i => i.question.id);
    return ids.map(id => qMap.get(id)).filter((q): q is NonNullable<typeof q> => q !== undefined);
  }, [practiceQueueIds, rankedQuestions, qMap]);

  const safeIndex = Math.min(Math.max(0, currentPracticeIndex), Math.max(0, activePracticeQuestions.length - 1));
  const currentQuestion = activePracticeQuestions[safeIndex];
  const currentProgress = currentQuestion ? progressMap.get(currentQuestion.id) : undefined;

  useEffect(() => {
    if (activeTab !== 'practice') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') {
        setCurrentPracticeIndex(prev => Math.min(activePracticeQuestions.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPracticeIndex(prev => Math.max(0, prev - 1));
      } else if (currentQuestion && ['1', '2', '3', '4'].includes(e.key)) {
        const optNum = parseInt(e.key, 10);
        if (currentQuestion.options.some(o => o.id === optNum) && selectedAnswers[currentQuestion.id] === undefined) {
          e.preventDefault();
          setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: optNum }));
          answerQuestion(currentQuestion.id, optNum, { mode: 'critical-review' });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activePracticeQuestions.length, currentQuestion, selectedAnswers, answerQuestion]);

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
              Tự động gom các câu trả lời sai và các câu điểm liệt đã làm nhưng chưa đạt ngưỡng 2 lần đúng liên tiếp.
            </p>
          </div>

          <button
            type="button"
            onClick={() => startPracticeSession(0)}
            disabled={rankedQuestions.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition disabled:opacity-40 touch-target flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Ôn {rankedQuestions.length} câu ưu tiên</span>
          </button>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2" role="tablist" aria-label="Chế độ ôn tập">
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
            onClick={() => startPracticeSession(0)}
            disabled={rankedQuestions.length === 0 && activePracticeQuestions.length === 0}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              activeTab === 'practice'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Luyện tập trực tiếp
          </button>
        </div>

        <button
          type="button"
          aria-pressed={includeUnseenCritical}
          onClick={() => setIncludeUnseenCritical(prev => !prev)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
            includeUnseenCritical
              ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
              : 'bg-white dark:bg-[#121826] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Kèm điểm liệt chưa học</span>
        </button>
      </div>

      {/* Tab 1: Queue List */}
      {activeTab === 'queue' && (
        <div className="space-y-2.5">
          {rankedQuestions.length > 0 ? (
            rankedQuestions.slice(0, 60).map(({ question, progress, score }, idx) => (
              <button
                type="button"
                key={question.id}
                onClick={() => startPracticeSession(idx)}
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
                    Ưu tiên: {score}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                    {progress && progress.attempts > 0 ? `${progress.correctCount}/${progress.attempts} đúng` : 'Chưa làm'}
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="bg-white dark:bg-[#121826] p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                Sạch hàng đợi câu sai!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Bạn không có câu trả lời sai nào đang tồn đọng. Có thể bật “Kèm điểm liệt chưa học” ở góc phải để rà soát toàn bộ 60 câu điểm liệt.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Practice directly with stable session snapshot */}
      {activeTab === 'practice' && currentQuestion && (
        <div className="space-y-4">
          <QuestionCard
            question={currentQuestion}
            policy={PRACTICE_MODE_POLICY}
            selectedOptionId={selectedAnswers[currentQuestion.id]}
            onSelectOption={(optId) => {
              if (selectedAnswers[currentQuestion.id] === optId) return;
              const firstTime = selectedAnswers[currentQuestion.id] === undefined;
              setSelectedAnswers(prev => ({ ...prev, [currentQuestion.id]: optId }));
              if (firstTime) {
                answerQuestion(currentQuestion.id, optId, { mode: 'critical-review' });
              }
            }}
            progress={currentProgress}
            onToggleBookmark={() => toggleBookmark(currentQuestion.id)}
            showIndex={safeIndex + 1}
            totalInList={activePracticeQuestions.length}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCurrentPracticeIndex(prev => Math.max(0, prev - 1))}
              disabled={safeIndex === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800/80 transition active:scale-[0.98] shadow-sm touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              <span>Câu trước</span>
            </button>
            <span className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400">
              {safeIndex + 1} / {activePracticeQuestions.length}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPracticeIndex(prev => Math.min(activePracticeQuestions.length - 1, prev + 1))}
              disabled={safeIndex === activePracticeQuestions.length - 1}
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
