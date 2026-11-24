import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  Award,
  XCircle
} from 'lucide-react';

export const ExamResultView: React.FC = () => {
  const {
    selectedExamResult,
    questions,
    setView,
    startRandomExam
  } = useApp();

  useEffect(() => {
    if (selectedExamResult?.passed) {
      import('canvas-confetti')
        .then(mod => {
          mod.default({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        })
        .catch(() => {});
    }
  }, [selectedExamResult]);

  if (!selectedExamResult) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-4 shadow-sm">
        <p className="text-slate-600 dark:text-slate-400 font-medium">Không tìm thấy kết quả bài thi.</p>
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  const qMap = new Map(questions.map(q => [q.id, q]));
  const durationMins = Math.floor(selectedExamResult.actualDurationSeconds / 60);
  const durationSecs = selectedExamResult.actualDurationSeconds % 60;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* 1. Score Summary Banner */}
      <div
        className={`rounded-2xl p-7 sm:p-8 text-center shadow-lg border relative overflow-hidden ${
          selectedExamResult.passed
            ? 'bg-gradient-to-b from-emerald-500/15 via-emerald-500/5 to-white dark:to-[#121826] border-emerald-300 dark:border-emerald-800/80'
            : 'bg-gradient-to-b from-rose-500/15 via-rose-500/5 to-white dark:to-[#121826] border-rose-300 dark:border-rose-800/80'
        }`}
      >
        <div className="inline-flex items-center justify-center p-3 rounded-2xl mb-3 shadow-inner">
          {selectedExamResult.passed ? (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Award className="w-9 h-9" aria-hidden="true" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/30">
              <XCircle className="w-9 h-9" aria-hidden="true" />
            </div>
          )}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
          {selectedExamResult.passed ? 'ĐẠT SÁT HẠCH' : 'CHƯA ĐẠT'}
        </h2>

        {/* Reason / Formula */}
        <p className="text-sm font-semibold mt-1.5">
          {selectedExamResult.passed ? (
            <span className="text-emerald-700 dark:text-emerald-400">
              {selectedExamResult.score}/30 câu đúng + Không sai câu điểm liệt → ĐẠT
            </span>
          ) : selectedExamResult.hasCriticalMistake ? (
            <span className="text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" aria-hidden="true" />
              Sai câu hỏi điểm liệt ({selectedExamResult.score}/30 câu đúng) → KHÔNG ĐẠT
            </span>
          ) : (
            <span className="text-rose-700 dark:text-rose-400 font-bold">
              Chưa đủ điểm đạt ({selectedExamResult.score}/30 câu đúng, tối thiểu cần 27/30)
            </span>
          )}
        </p>

        {/* Metrics Bar */}
        <div className="grid grid-cols-4 gap-2 mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800 text-center">
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Điểm số</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {selectedExamResult.score}/30
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Đúng</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {selectedExamResult.correctCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Sai / Bỏ</div>
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {selectedExamResult.incorrectCount + selectedExamResult.unansweredCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Thời gian</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
              {durationMins}:{String(durationSecs).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <button
            type="button"
            onClick={startRandomExam}
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 active:scale-[0.97] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Thi đề mới
          </button>
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            Về trang chủ
          </button>
        </div>
      </div>

      {/* 2. Detailed Question Review */}
      <div className="space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
          Xem lại chi tiết 30 câu hỏi
        </h3>

        <div className="space-y-4">
          {selectedExamResult.questionIds.map((qid, idx) => {
            const q = qMap.get(qid);
            if (!q) return null;

            const ans = selectedExamResult.answers[qid];
            const isAnswered = ans?.selectedOptionId !== undefined;
            const isCorrect = ans?.isCorrect || false;

            return (
              <div
                key={qid}
                className={`p-5 sm:p-6 rounded-2xl border bg-white dark:bg-[#121826] shadow-sm transition ${
                  isCorrect
                    ? 'border-emerald-200 dark:border-emerald-900/40'
                    : 'border-rose-200 dark:border-rose-900/40 ring-1 ring-rose-500/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Câu {idx + 1} <span className="text-xs text-slate-400 font-mono tabular-nums font-normal">(Gốc: #{q.questionNumber})</span>
                    </span>
                    {q.isCritical && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400 dark:border dark:border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                        Điểm liệt
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isCorrect
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border dark:border-emerald-500/30'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border dark:border-rose-500/30'
                    }`}
                  >
                    {isCorrect ? '✓ Đúng' : isAnswered ? '✗ Sai' : 'Chưa trả lời'}
                  </span>
                </div>

                <p className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-4 leading-relaxed">
                  {q.content}
                </p>

                {q.image && (
                  <div className="mb-4 max-w-sm rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-2">
                    <img
                      src={`/images/${q.image.src}`}
                      alt={`Minh họa câu ${q.questionNumber}`}
                      className="max-h-48 object-contain mx-auto"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {q.options.map(opt => {
                    const isUserChosen = ans?.selectedOptionId === opt.id;
                    const isOfficialCorrect = opt.isCorrect;

                    let optClass = 'border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300';
                    if (isOfficialCorrect) {
                      optClass = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-950 dark:text-emerald-200 font-semibold';
                    } else if (isUserChosen && !isOfficialCorrect) {
                      optClass = 'border-rose-500 bg-rose-50 dark:bg-rose-500/15 text-rose-950 dark:text-rose-200 line-through';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${optClass}`}
                      >
                        <span>
                          <strong className="font-mono tabular-nums">{opt.id}.</strong> {opt.text}
                        </span>
                        {isOfficialCorrect && <span className="text-emerald-600 dark:text-emerald-400 font-bold ml-2 text-xs">Đáp án đúng</span>}
                        {isUserChosen && !isOfficialCorrect && <span className="text-rose-600 dark:text-rose-400 font-bold ml-2 text-xs">Bạn chọn</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
