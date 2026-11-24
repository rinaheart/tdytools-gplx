import React, { useMemo } from 'react';
import type { CramSession } from '../../../types/cram';
import type { ExamRecord, Question, UserProgressItem } from '../../../types/quiz';
import { getQuestionsNeedingReview } from '../../../services/learningEngine';
import {
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  TrendingUp,
  Compass,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';

interface CramResultStageProps {
  session: CramSession;
  questions?: Question[];
  progressMap?: Map<string, UserProgressItem>;
  exam1Record?: ExamRecord;
  exam2Record?: ExamRecord;
  onFinish: () => void;
  onRetestWeak: () => void;
}

export const CramResultStage: React.FC<CramResultStageProps> = ({
  session,
  questions = [],
  progressMap = new Map(),
  exam1Record,
  exam2Record,
  onFinish,
  onRetestWeak
}) => {
  const readiness = session.readiness;
  const level = readiness?.level ?? 'not-ready';
  const baseline = session.baseline;

  // Tính trạng thái Sau phiên (Current Global State)
  const currentCriticalMastered = useMemo(() => {
    return questions.filter(q => q.isCritical && progressMap.get(q.id)?.status === 'mastered').length;
  }, [questions, progressMap]);

  const currentMasteredCount = useMemo(() => {
    return questions.filter(q => progressMap.get(q.id)?.status === 'mastered').length;
  }, [questions, progressMap]);

  const currentReviewCount = useMemo(() => {
    return getQuestionsNeedingReview(questions, progressMap, true).length;
  }, [questions, progressMap]);

  // Cấu hình nhãn mức độ sẵn sàng (Tuân thủ Purple Ban: không dùng tím)
  const levelConfig = {
    high: {
      title: 'MỨC ĐỘ SẴN SÀNG: RẤT CAO',
      badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      icon: ShieldCheck,
      iconColor: 'text-emerald-500'
    },
    good: {
      title: 'MỨC ĐỘ SẴN SÀNG: KHÁ TỐT',
      badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      icon: CheckCircle2,
      iconColor: 'text-blue-500'
    },
    borderline: {
      title: 'MỨC ĐỘ SẴN SÀNG: MẤP MÉ (CẦN LƯU Ý)',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      icon: AlertTriangle,
      iconColor: 'text-amber-500'
    },
    'not-ready': {
      title: 'MỨC ĐỘ SẴN SÀNG: CHƯA AN TOÀN',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
      icon: AlertTriangle,
      iconColor: 'text-rose-500'
    }
  }[level];

  const Icon = levelConfig.icon;

  // Format mức độ sẵn sàng baseline
  const baselineLevelTitle = {
    high: 'RẤT CAO',
    good: 'KHÁ TỐT',
    borderline: 'MẤP MÉ',
    'not-ready': 'CHƯA AN TOÀN'
  }[baseline?.readinessLevel || 'not-ready'];

  const currentLevelTitle = {
    high: 'RẤT CAO',
    good: 'KHÁ TỐT',
    borderline: 'MẤP MÉ',
    'not-ready': 'CHƯA AN TOÀN'
  }[level];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in py-3">
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER BANNER KẾT QUẢ TỔNG QUAN
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 dark:bg-[#121826] text-white p-6 sm:p-7 rounded-3xl border border-slate-800 shadow-sm relative overflow-hidden space-y-4">
        <div className="flex items-center gap-2">
          <span className={`text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border ${levelConfig.badgeClass} flex items-center gap-1.5`}>
            <Icon className="w-4 h-4" />
            <span>{levelConfig.title}</span>
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            <span>Kết Quả Lộ Trình Cấp Tốc 120 Phút</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {readiness?.summaryText || 'Toàn bộ tiến độ và kết quả trong phiên đã được hòa nhập trực tiếp vào hồ sơ học tập chung của bạn.'}
          </p>
        </div>

        <div className="text-[11px] text-slate-400 italic">
          * Đánh giá năng lực tự động dựa trên quy chuẩn đề thi 30 câu GPLX Hạng B và 60 câu điểm liệt chính thức.
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. BẢNG SO SÁNH TRƯỚC PHIÊN → SAU PHIÊN (BEFORE / AFTER DELTA)
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#121826] p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Chuyển Biến Học Tập (Trước Phiên → Sau Phiên)</span>
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Đồng bộ hồ sơ thời gian thực
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Chỉ số 1: Điểm liệt vững chắc */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              60 Câu Điểm Liệt
            </div>
            <div className="flex items-center gap-2 font-mono text-base font-black">
              <span className="text-slate-400">
                {baseline ? `${baseline.criticalMastered}/60` : '—'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className={currentCriticalMastered >= 60 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {currentCriticalMastered}/60
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {currentCriticalMastered >= 60 ? '✓ Đạt chuẩn an toàn' : 'Cần ôn thêm câu sót'}
            </div>
          </div>

          {/* Chỉ số 2: Câu đã thành thạo (Mastered) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Thành Thạo (Mastered)
            </div>
            <div className="flex items-center gap-2 font-mono text-base font-black">
              <span className="text-slate-400">
                {baseline ? `${baseline.masteredCount}/600` : '—'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className="text-blue-600 dark:text-blue-400">
                {currentMasteredCount}/600
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {baseline && currentMasteredCount > baseline.masteredCount
                ? `+${currentMasteredCount - baseline.masteredCount} câu vững chắc`
                : 'Đã cập nhật tiến độ'}
            </div>
          </div>

          {/* Chỉ số 3: Câu cần ôn (Dynamic Review) */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Câu Cần Ôn Tập
            </div>
            <div className="flex items-center gap-2 font-mono text-base font-black">
              <span className="text-slate-400">
                {baseline ? baseline.reviewCount : '—'}
              </span>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              <span className={currentReviewCount === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                {currentReviewCount}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {baseline && currentReviewCount < baseline.reviewCount
                ? `Đã giải tỏa ${baseline.reviewCount - currentReviewCount} câu`
                : 'Các câu cần rà soát'}
            </div>
          </div>

          {/* Chỉ số 4: Mức độ sẵn sàng */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Mức Sẵn Sàng
            </div>
            <div className="flex items-center gap-1.5 text-xs font-black">
              <span className="text-slate-400 truncate max-w-[80px]">
                {baselineLevelTitle}
              </span>
              <ArrowRight className="w-3 h-3 text-blue-500 shrink-0" />
              <span className="text-emerald-600 dark:text-emerald-400 truncate">
                {currentLevelTitle}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {level === 'high' || level === 'good' ? 'Sẵn sàng thi sát hạch' : 'Cần củng cố thêm'}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. KẾT QUẢ 2 BÀI THI THỬ TRONG PHIÊN
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bài thi thử #1 */}
        <div className="bg-white dark:bg-[#121826] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Bài Thi Thử Chẩn Đoán #1 (30 câu)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {exam1Record ? `${exam1Record.score}/30` : '—'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              exam1Record?.passed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {exam1Record?.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
            </span>
            {exam1Record?.hasCriticalMistake && (
              <span className="text-[11px] font-bold text-rose-600">Sai điểm liệt</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {exam1Record ? `Hoàn thành trong ${Math.round(exam1Record.actualDurationSeconds / 60)} phút.` : 'Chưa có dữ liệu bài thi #1.'}
          </p>
        </div>

        {/* Bài thi thử #2 */}
        <div className="bg-white dark:bg-[#121826] p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Bài Thi Thử Kiểm Chứng #2 (30 câu)
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {exam2Record ? `${exam2Record.score}/30` : '—'}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              exam2Record?.passed
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            }`}>
              {exam2Record?.passed ? 'ĐẠT' : 'CHƯA ĐẠT'}
            </span>
            {exam2Record?.hasCriticalMistake && (
              <span className="text-[11px] font-bold text-rose-600">Sai điểm liệt</span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {exam2Record ? `Hoàn thành trong ${Math.round(exam2Record.actualDurationSeconds / 60)} phút.` : 'Chưa có dữ liệu bài thi #2.'}
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. KHUYẾN NGHỊ BƯỚC TIẾP THEO
      ───────────────────────────────────────────────────────────── */}
      <div className="bg-blue-50/80 dark:bg-blue-500/10 border border-blue-200/80 dark:border-blue-500/20 p-5 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-sm">
          <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Khuyến nghị bước tiếp theo:</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {readiness?.nextActionRecommendation || 'Tiếp tục luyện thêm đề thi ngẫu nhiên để duy trì phong độ và độ nhạy phản xạ.'}
        </p>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. NÚT ĐIỀU HƯỚNG HÀNH ĐỘNG
      ───────────────────────────────────────────────────────────── */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          type="button"
          onClick={onRetestWeak}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Ôn lại các câu sai trong phiên</span>
        </button>

        <button
          type="button"
          onClick={onFinish}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition"
        >
          <Compass className="w-4 h-4" />
          <span>Về Tổng Quan (Dashboard)</span>
        </button>
      </div>
    </div>
  );
};
