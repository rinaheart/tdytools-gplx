import React from 'react';
import { useApp } from '../context/AppContext';
import { getFixedExamNumber } from '../services/examEngine';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  Play,
  XCircle
} from 'lucide-react';

interface FixedExamsViewProps {
  onBack?: () => void;
}

export const FixedExamsView: React.FC<FixedExamsViewProps> = ({ onBack }) => {
  const { examHistory, startFixedExam, viewExamResult } = useApp();

  const totalExams = 18;
  const examItems = Array.from({ length: totalExams }, (_, i) => i + 1);

  // Group history by fixed exam number (tương thích cả bản ghi cũ & mới)
  const fixedHistoryMap = new Map<number, (typeof examHistory)[0]>();
  for (const record of examHistory) {
    const num = getFixedExamNumber(record);
    if (num !== null) {
      const existing = fixedHistoryMap.get(num);
      if (!existing || record.score > existing.score) {
        fixedHistoryMap.set(num, record);
      }
    }
  }

  const completedCount = fixedHistoryMap.size;

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-24 animate-fade-in">
      {/* Nút quay lại dành cho mobile khi vào từ Hub */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 touch-target"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Quay lại chọn chế độ thi</span>
        </button>
      )}

      {/* Header Banner 18 Đề Mẫu */}
      <div className="bg-slate-900 dark:bg-[#121826] rounded-3xl p-5 sm:p-7 text-white border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
            <Award className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>18 Bộ Đề Mẫu Chuẩn Hạng B</span>
          </div>

          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
            18 Đề Mẫu Sát Hạch Chuẩn Mực
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
            Các bộ đề được sinh từ Blueprint Hạng B 30 câu (1 điểm liệt + 8 quy tắc + 1 văn hóa + 1 kỹ thuật + 1 sửa chữa + 9 biển báo + 9 sa hình) bằng thuật toán số ngẫu nhiên có hạt giống, đảm bảo độ bao phủ ngân hàng đề thi.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 font-mono tabular-nums">
              <span className="text-slate-300 font-sans font-medium">Tiến độ:</span>
              <span className="text-blue-400 font-bold">{completedCount} / 18 đề</span>
            </div>
            <span className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
              30 câu chuẩn
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
              20 phút
            </span>
            <span className="bg-white/10 px-2.5 py-1 rounded-xl border border-white/10 text-xs">
              Đạt ≥ 27/30
            </span>
            <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-xl border border-rose-500/30 text-xs font-medium">
              0 sai điểm liệt
            </span>
          </div>
        </div>
      </div>

      {/* Grid of 18 exams */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {examItems.map((num) => {
          const pastRecord = fixedHistoryMap.get(num);

          return (
            <div
              key={num}
              className="bg-white dark:bg-[#121826] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                    B-TRAIN-{String(num).padStart(3, '0')}
                  </span>
                  {pastRecord && (
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono tabular-nums ${
                        pastRecord.passed
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border dark:border-emerald-500/30'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border dark:border-rose-500/30'
                      }`}
                    >
                      {pastRecord.passed ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          <span>Đạt {pastRecord.score}/30</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 text-rose-600" aria-hidden="true" />
                          <span>{pastRecord.score}/30</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  Đề luyện số {num}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {pastRecord
                    ? `Đã làm • Điểm cao nhất: ${pastRecord.score}/30`
                    : 'Chưa làm bài thi này'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => startFixedExam(num)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-[0.98] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{pastRecord ? 'Thi lại' : 'Bắt đầu thi'}</span>
                </button>

                {pastRecord && (
                  <button
                    type="button"
                    onClick={() => viewExamResult(pastRecord)}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-[0.98] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
                  >
                    Xem lại
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default FixedExamsView;
