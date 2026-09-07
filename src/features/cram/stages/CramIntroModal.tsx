import React from 'react';
import { Flame, Clock, ArrowRight, X } from 'lucide-react';

interface CramIntroModalProps {
  onStart: () => void;
  onCancel: () => void;
}

export const CramIntroModal: React.FC<CramIntroModalProps> = ({ onStart, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#0f1523] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-5 sm:p-7 shadow-2xl space-y-5 relative max-h-[92vh] overflow-y-auto">
        {/* Nút đóng */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Chế độ Cấp Tốc Cứu Nguy</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Lộ Trình Ôn Cấp Tốc 120 Phút
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Thiết kế đặc biệt cho học viên chuẩn bị thi sát hạch Hạng B. Tối đa hóa xác suất đạt trong đúng 120 phút bằng việc triệt tiêu lỗi điểm liệt và mô phỏng 2 bài thi chuẩn.
          </p>
        </div>

        {/* 7 Giai đoạn vắn tắt */}
        <div className="bg-slate-50 dark:bg-[#151c2d] rounded-2xl p-4 border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center justify-between">
            <span>7 Giai Đoạn Liên Hoàn</span>
            <span className="text-blue-600 dark:text-blue-400 font-mono">120 Phút</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Chẩn đoán 60 câu điểm liệt (15p):</strong> Quét nhanh triệt để nguy cơ trượt trực tiếp.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Sửa lỗi điểm liệt (20p):</strong> Học giải thích sâu các câu trả lời sai.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Thi thử chuẩn #1 (20p):</strong> 30 câu chuẩn ma trận đề thi CSGT.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">4</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Phân tích lỗ hổng (10p):</strong> Bóc tách tỷ lệ sai theo từng nhóm chủ đề.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">5</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Luyện điểm yếu tập trung (25p):</strong> Vá lỗi các nhóm có tỷ lệ sai nhiều nhất.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">6</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Thi thử kiểm chứng #2 (20p):</strong> Xác nhận khả năng đạt đề thi thứ hai.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">7</span>
              <div>
                <strong className="text-slate-800 dark:text-slate-200">Kiểm tra an toàn cuối (10p):</strong> Rà soát chốt chặn và đánh giá mức độ sẵn sàng.
              </div>
            </div>
          </div>
        </div>

        {/* Cam kết & Lưu ý */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/70 dark:bg-blue-500/10 border border-blue-200/60 dark:border-blue-500/20 text-blue-800 dark:text-blue-300 text-xs">
          <Clock className="w-4 h-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
          <span>
            Hệ thống hỗ trợ <strong>Tạm dừng</strong> và <strong>Tự động lưu tiến độ</strong>. Bạn có thể thoát và quay lại tiếp tục bất kỳ lúc nào.
          </span>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition"
          >
            <span>Bắt đầu ôn 120 phút</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
