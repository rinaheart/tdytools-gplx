import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Shield,
  Trash2,
  Upload
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    progressMap,
    examHistory,
    exportBackup,
    importBackup,
    resetAllProgress,
    profile
  } = useApp();

  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = await importBackup(content);
        setImportStatus(res);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24 animate-fade-in">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white">
          Cài Đặt & Quản Lý Dữ Liệu
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Lưu trữ ngoại tuyến Offline-First an toàn trên trình duyệt (IndexedDB Dexie)
        </p>
      </div>

      {/* 1. Backup & Restore Section */}
      <div className="bg-white dark:bg-[#121826] p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span>Sao lưu & Phục hồi dữ liệu (Backup / Restore)</span>
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Xuất toàn bộ tiến độ học, điểm thành thạo và lịch sử thi thử thành file JSON chuẩn (`schemaVersion: 1`). Bạn có thể mang sang thiết bị khác hoặc lưu trữ an toàn.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={exportBackup}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-blue-500/20 active:scale-[0.97] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Xuất file sao lưu (JSON)</span>
          </button>

          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            aria-label="Chọn file sao lưu định dạng JSON"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            <span>Nhập file sao lưu</span>
          </button>
        </div>

        {importStatus && (
          <div
            role="status"
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 ${
              importStatus.success
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
            }`}
          >
            {importStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" /> : <AlertTriangle className="w-4 h-4 text-rose-600" aria-hidden="true" />}
            <span>{importStatus.message}</span>
          </div>
        )}
      </div>

      {/* 2. System Legal References */}
      <div className="bg-white dark:bg-[#121826] p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>Căn Cứ Pháp Lý & Hồ Sơ Đề Thi</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Hồ sơ áp dụng hiện hành: Hạng B ({profile.id})
            </div>
            <div>• Ngân hàng câu hỏi: <strong>600 câu Cục Cảnh sát giao thông 2025</strong></div>
            <div>• Văn bản quy định: <strong>Công văn số 2262/CSGT-P5</strong> ngày 07/05/2025</div>
            <div>• Cấu trúc đề: <strong>30 câu hỏi / 20 phút / Đạt $\ge$ 27/30</strong> và không sai câu điểm liệt</div>
            <div>• Hiệu lực quy chế: Từ 01/06/2025 đến 28/02/2027</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
            <div className="font-bold text-slate-900 dark:text-white text-sm">
              Quy định chuyển tiếp: Thông tư 108/2026/TT-BCA
            </div>
            <div>• Hiệu lực thi hành: 01/07/2026</div>
            <div>• Nội dung sát hạch mới đối với hạng B (50 câu/33 phút/45 điểm) <strong>chính thức áp dụng từ ngày 01/03/2027</strong></div>
            <div>• Trạng thái hệ thống: Đã dự phòng sẵn hồ sơ `B_2027_PLACEHOLDER` (khóa tạo đề cho đến khi ban hành câu hỏi mới).</div>
          </div>
        </div>
      </div>

      {/* 3. Danger Zone: Reset Data */}
      <div className="bg-white dark:bg-[#121826] p-6 sm:p-7 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          <span>Vùng nguy hiểm</span>
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Xóa toàn bộ tiến độ làm bài (<span className="font-mono tabular-nums">{progressMap.size}</span> câu đã ghi nhận) và <span className="font-mono tabular-nums">{examHistory.length}</span> bài thi thử trong trình duyệt.
        </p>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-5 py-2.5 rounded-2xl text-xs font-bold border border-rose-200 dark:border-rose-900 transition active:scale-[0.97] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            <span>Xóa toàn bộ tiến độ</span>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-900 space-y-3">
            <p className="text-xs text-rose-800 dark:text-rose-200 font-bold">
              Hành động này không thể hoàn tác! Bạn có chắc chắn muốn xóa hết dữ liệu?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await resetAllProgress();
                  setShowResetConfirm(false);
                }}
                className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 transition active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                Xác nhận xóa hết
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Hủy
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

