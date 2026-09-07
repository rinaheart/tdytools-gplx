import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { QuestionCard } from './QuestionCard';
import { PRACTICE_MODE_POLICY } from '../types/quiz';
import { AlertTriangle, Image, Search, X } from 'lucide-react';

export const SearchView: React.FC = () => {
  const { questions, chapters, progressMap, answerQuestion, toggleBookmark } = useApp();

  const [query, setQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<number | undefined>(undefined);
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [hasImageOnly, setHasImageOnly] = useState(false);

  // Selected answer map for practice within search
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const searchResults = useMemo(() => {
    const qTrim = query.trim().toLowerCase();
    const isNum = /^\d+$/.test(qTrim);
    const targetNum = isNum ? parseInt(qTrim, 10) : null;

    return questions.filter(q => {
      // Direct question number search
      if (targetNum !== null) {
        if (q.questionNumber !== targetNum) return false;
      } else if (qTrim) {
        const inContent = q.content.toLowerCase().includes(qTrim);
        const inOptions = q.options.some(o => o.text.toLowerCase().includes(qTrim));
        if (!inContent && !inOptions) return false;
      }

      if (selectedChapter && q.chapterId !== selectedChapter) return false;
      if (criticalOnly && !q.isCritical) return false;
      if (hasImageOnly && !q.image) return false;

      return true;
    });
  }, [questions, query, selectedChapter, criticalOnly, hasImageOnly]);

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-24 animate-fade-in">
      {/* Search Bar & Filter Header */}
      <div className="bg-white dark:bg-[#121826] p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
          <input
            id="question-search-input"
            name="searchQuery"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nhập số câu (vd: 19) hoặc từ khóa (vd: nồng độ cồn, nhường đường, biển cấm)…"
            autoComplete="off"
            spellCheck={false}
            aria-label="Tìm kiếm câu hỏi trong ngân hàng 600 câu"
            className="w-full bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 pl-12 pr-11 py-3.5 rounded-2xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition text-slate-900 dark:text-white"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Xóa từ khóa tìm kiếm"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1 no-scrollbar">
          <button
            type="button"
            aria-pressed={criticalOnly}
            onClick={() => setCriticalOnly(prev => !prev)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              criticalOnly
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Chỉ 60 điểm liệt</span>
          </button>

          <button
            type="button"
            aria-pressed={hasImageOnly}
            onClick={() => setHasImageOnly(prev => !prev)}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              hasImageOnly
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Image className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Có hình ảnh</span>
          </button>

          {chapters.map(ch => (
            <button
              type="button"
              key={ch.id}
              aria-pressed={selectedChapter === ch.id}
              onClick={() => setSelectedChapter(prev => prev === ch.id ? undefined : ch.id)}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white ${
                selectedChapter === ch.id
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Chương {ch.id}
            </button>
          ))}
        </div>
      </div>

      {/* Results summary */}
      <div className="text-xs font-mono tabular-nums font-bold text-slate-500 dark:text-slate-400 px-2">
        Tìm thấy <strong className="text-slate-900 dark:text-white font-mono tabular-nums">{searchResults.length}</strong> kết quả phù hợp
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {searchResults.slice(0, 30).map(q => {
          const prog = progressMap.get(q.id);
          const currentOpt = selectedAnswers[q.id];

          return (
            <QuestionCard
              key={q.id}
              question={q}
              policy={PRACTICE_MODE_POLICY}
              selectedOptionId={currentOpt}
              onSelectOption={(optId) => {
                setSelectedAnswers(prev => ({ ...prev, [q.id]: optId }));
                const correct = q.options.find(o => o.isCorrect);
                answerQuestion(q.id, optId === correct?.id);
              }}
              progress={prog}
              onToggleBookmark={() => toggleBookmark(q.id)}
            />
          );
        })}

        {searchResults.length > 30 && (
          <div className="text-center p-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Đang hiển thị 30 / {searchResults.length} kết quả. Vui lòng nhập từ khóa cụ thể hơn để thu hẹp tìm kiếm.
          </div>
        )}

        {searchResults.length === 0 && (
          <div className="bg-white dark:bg-[#121826] p-12 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-2 shadow-sm">
            <p className="text-base text-slate-600 dark:text-slate-400 font-medium">
              Không tìm thấy câu hỏi nào phù hợp với từ khóa “{query}”.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

