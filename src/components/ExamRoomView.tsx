import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { FixedExamsView } from './FixedExamsView';
import { getFixedExamNumber, isStandardRandomExam } from '../services/examEngine';
import {
  Award,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Flame,
  Play,
  RotateCcw,
  Shuffle,
  Sparkles,
  XCircle
} from 'lucide-react';

export const ExamRoomView: React.FC = () => {
  const { examHistory, startRandomExam, viewExamResult } = useApp();

  // Trên mobile: Quản lý chọn mode: 'hub' (màn hình chọn), 'sample' (18 đề mẫu), 'random' (đề ngẫu nhiên)
  const [mobileSelection, setMobileSelection] = useState<'hub' | 'sample' | 'random'>('hub');

  // Lịch sử các đề thi ngẫu nhiên độc lập (không lẫn đề mẫu cố định và đề Cram)
  const randomHistory = examHistory
    .filter(isStandardRandomExam)
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  // Đếm số đề mẫu đã hoàn thành
  const sampleCompletedCount = new Set(
    examHistory.map(e => getFixedExamNumber(e)).filter((n): n is number => n !== null)
  ).size;

  return (
    <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6 pb-24 animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          1. TRÊN MOBILE: NẾU ĐANG CHỌN XEM "18 ĐỀ MẪU"
      ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {mobileSelection === 'sample' && (
          <FixedExamsView onBack={() => setMobileSelection('hub')} />
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TRÊN MOBILE: MÀN HÌNH CHỌN CHẾ ĐỘ THI (SELECTOR HUB)
      ───────────────────────────────────────────────────────────── */}
      <div className="md:hidden">
        {mobileSelection === 'hub' && (
          <div className="space-y-5 animate-fade-in">
            {/* Mobile Header Banner */}
            <div className="bg-slate-900 dark:bg-[#121826] rounded-3xl p-5 text-white border border-slate-800 shadow-sm relative overflow-hidden">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10 mb-2">
                <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                <span>Phòng Thi Sát Hạch</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                Chọn Chế Độ Thi Thử
              </h2>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Chuẩn 30 câu • 20 phút • Đạt ≥ 27/30 • 0 sai câu điểm liệt. Chọn một trong hai hình thức dưới đây để bắt đầu.
              </p>
            </div>

            {/* 2 Lựa chọn lớn trên mobile */}
            <div className="grid grid-cols-1 gap-4">
              {/* Option 1: 18 Đề mẫu */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setMobileSelection('sample')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') setMobileSelection('sample');
                }}
                className="bg-white dark:bg-[#121826] p-5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-sm">
                      <Award className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 px-2.5 py-1 rounded-full">
                      {sampleCompletedCount}/18 đề đã làm
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    18 Đề Mẫu Chuẩn
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    18 bộ đề cố định sinh theo thuật toán có hạt giống, phủ trọn vẹn toàn bộ ngân hàng 600 câu sát hạch Hạng B.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Xem danh sách 18 đề</span>
                  <span>→</span>
                </div>
              </div>

              {/* Option 2: Đề ngẫu nhiên */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setMobileSelection('random')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') setMobileSelection('random');
                }}
                className="bg-white dark:bg-[#121826] p-5 rounded-2xl border-2 border-slate-200/80 dark:border-slate-800 hover:border-amber-500 dark:hover:border-amber-500 shadow-sm transition-all active:scale-[0.98] cursor-pointer group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shadow-sm">
                      <Shuffle className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2.5 py-1 rounded-full">
                      {randomHistory.length} lần thi
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                    Đề Thi Ngẫu Nhiên
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    Tạo đề ngẫu nhiên mới từ kho 600 câu chuẩn ma trận sát hạch Cục CSGT. Lưu và xem lại toàn bộ lịch sử thi.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400">
                  <span>Vào phòng thi ngẫu nhiên</span>
                  <span>→</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. NỘI DUNG "ĐỀ NGẪU NHIÊN & LỊCH SỬ THI"
          (Hiển thị trên Desktop luôn luôn; Trên Mobile hiển thị khi mobileSelection === 'random')
      ───────────────────────────────────────────────────────────── */}
      <div className={`${mobileSelection === 'random' ? 'block' : 'hidden md:block'} space-y-5 sm:space-y-6 animate-fade-in`}>
        {/* Nút quay lại dành cho mobile */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setMobileSelection('hub')}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-[#121826] border border-slate-200/80 dark:border-slate-800 px-3 py-1.5 rounded-xl shadow-sm transition active:scale-95 touch-target"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại chọn chế độ thi</span>
          </button>
        </div>

        {/* Banner Desktop & Mobile */}
        <div className="bg-slate-900 dark:bg-[#121826] rounded-3xl p-5 sm:p-7 text-white border border-slate-800 shadow-sm relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
              <Flame className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>Phòng Thi Sát Hạch</span>
            </div>

            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white">
              Thi Thử Ngẫu Nhiên & Lịch Sử Thi
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-normal leading-relaxed">
              Mỗi bài thi bao gồm 30 câu hỏi ngẫu nhiên sinh từ toàn bộ ngân hàng 600 câu sát hạch Hạng B theo đúng tỷ lệ: 1 câu điểm liệt, 8 câu luật, 1 câu văn hóa, 1 câu kỹ thuật lái xe, 1 câu cấu tạo sửa chữa, 9 câu biển báo và 9 câu sa hình.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-200">
              <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                30 câu ngẫu nhiên
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                20 phút làm bài
              </span>
              <span className="bg-white/10 px-2.5 py-1 rounded-lg border border-white/10">
                Đạt ≥ 27/30
              </span>
              <span className="bg-rose-500/20 text-rose-300 px-2.5 py-1 rounded-lg border border-rose-500/30 font-semibold">
                0 sai điểm liệt
              </span>
            </div>
          </div>
        </div>

        {/* Action Card: Bắt đầu đề mới */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 sm:p-7 text-white shadow-lg shadow-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
              <span>Sinh đề mới tức thì</span>
            </div>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white tracking-tight">
              Bắt Đầu Bài Thi Thử Ngẫu Nhiên Mới
            </h3>
            <p className="text-xs sm:text-sm text-blue-100 max-w-xl font-normal leading-relaxed">
              Thử thách phản xạ với bộ đề bất kỳ. Thời gian đếm ngược 20 phút, tự động nộp bài khi hết giờ.
            </p>
          </div>

          <button
            type="button"
            onClick={startRandomExam}
            className="px-6 py-3.5 bg-white text-blue-700 hover:bg-blue-50 rounded-2xl font-bold text-sm sm:text-base shadow-xl active:scale-95 transition-all flex items-center gap-2 flex-shrink-0"
          >
            <Play className="w-4 h-4 fill-current text-blue-600" aria-hidden="true" />
            <span>Bắt đầu thi ngay</span>
          </button>
        </div>

        {/* Lịch sử thi thử ngẫu nhiên */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Lịch sử các lần thi ngẫu nhiên</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                ({randomHistory.length} lượt thi)
              </span>
            </h4>
          </div>

          {randomHistory.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {randomHistory.map((record, index) => {
                const dateStr = new Date(record.completedAt).toLocaleString('vi-VN', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                });
                const durationMin = Math.floor(record.actualDurationSeconds / 60);
                const durationSec = record.actualDurationSeconds % 60;

                return (
                  <div
                    key={record.id}
                    className="bg-white dark:bg-[#121826] p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          #{randomHistory.length - index} • {dateStr}
                        </span>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 font-mono tabular-nums ${
                            record.passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border dark:border-emerald-500/30'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300 dark:border dark:border-rose-500/30'
                          }`}
                        >
                          {record.passed ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
                              <span>ĐẠT {record.score}/30</span>
                            </>
                          ) : record.hasCriticalMistake ? (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                              <span>LIỆT ({record.score}/30)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
                              <span>KHÔNG ĐẠT ({record.score}/30)</span>
                            </>
                          )}
                        </span>
                      </div>

                      <h5 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {record.title}
                      </h5>

                      <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          {durationMin}m {durationSec}s
                        </span>
                        <span>•</span>
                        <span>Đúng: {record.correctCount}/30</span>
                        <span>•</span>
                        <span>Sai: {record.incorrectCount}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => viewExamResult(record)}
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition active:scale-95"
                      >
                        Xem lại bài làm
                      </button>
                      <button
                        type="button"
                        onClick={startRandomExam}
                        className="px-3.5 py-2 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-500/20 transition active:scale-95 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Thi đề khác</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#121826] p-8 sm:p-10 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-center space-y-3 shadow-sm">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto">
                <Shuffle className="w-6 h-6" aria-hidden="true" />
              </div>
              <h5 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Chưa có lần thi ngẫu nhiên nào
              </h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Hãy bấm nút &quot;Bắt đầu thi ngay&quot; ở trên để trải nghiệm đề thi thử ngẫu nhiên theo chuẩn sát hạch Cục CSGT.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ExamRoomView;
