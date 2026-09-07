import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  BookOpen,
  ChevronRight,
  Flame,
  History,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  Zap
} from 'lucide-react';
import { CramIntroModal } from '../features/cram/stages/CramIntroModal';

export const Dashboard: React.FC = () => {
  const {
    questions,
    chapters,
    progressMap,
    examHistory,
    readiness,
    nextAction,
    setView,
    setPracticeFilter,
    startRandomExam,
    cramSession,
    startCram
  } = useApp();

  const [showCramIntro, setShowCramIntro] = React.useState(false);

  const totalQuestions = questions.length;
  const criticalQuestions = questions.filter(q => q.isCritical);

  const attemptedCount = questions.filter(
    q => (progressMap.get(q.id)?.attempts || 0) > 0
  ).length;

  const masteredCount = questions.filter(
    q => progressMap.get(q.id)?.status === 'mastered'
  ).length;

  const criticalMasteredCount = criticalQuestions.filter(
    q => progressMap.get(q.id)?.status === 'mastered'
  ).length;

  // Review count
  const reviewCount = questions.filter(
    q => progressMap.get(q.id)?.status === 'review'
  ).length;

  // Fixed exams completed count
  const fixedHistoryCount = new Set(
    examHistory.filter(e => e.title.startsWith('Đề luyện chuẩn')).map(e => e.title)
  ).size;

  // Handler for Next Best Action button
  const handleExecuteNextAction = () => {
    if (nextAction.targetMode === 'practice') {
      if (nextAction.filterParam === 'critical') {
        setPracticeFilter({ status: 'all', criticalOnly: true });
      } else if (nextAction.filterParam === 'unseen') {
        setPracticeFilter({ status: 'unseen' });
      }
      setView('practice');
    } else if (nextAction.targetMode === 'exam') {
      startRandomExam();
    } else if (nextAction.targetMode === 'review') {
      setView('review');
    } else if (nextAction.targetMode === 'fixed-exams') {
      setView('fixed-exams');
    }
  };

  const handleSelectChapter = (chapterId: number) => {
    setPracticeFilter({ chapterId, status: 'all' });
    setView('practice');
  };

  return (
    <div className="space-y-6 pb-16 animate-fade-in max-w-6xl mx-auto">
      {/* ─────────────────────────────────────────────────────────────
          ACTIVE CRAM SESSION RESUME BANNER (NẾU ĐANG CÓ PHIÊN CẤP TỐC DỞ)
      ───────────────────────────────────────────────────────────── */}
      {cramSession && cramSession.status === 'active' && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-slate-950"></span>
            </span>
            <div>
              <div className="text-xs font-black uppercase tracking-tight">
                ⚡ Đang Có Lộ Trình Cấp Tốc 120 Phút
              </div>
              <div className="text-xs text-slate-900 font-medium">
                {cramSession.isPaused ? 'Đang tạm dừng bộ đếm giờ' : 'Thời gian thực tế đang trôi • Hãy hoàn tất sớm'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setView('cram')}
            className="bg-slate-950 text-amber-300 hover:bg-slate-900 font-bold text-xs px-5 py-2 rounded-xl shadow transition active:scale-95 flex-shrink-0"
          >
            Tiếp tục lộ trình ngay →
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PHÂN KHU 1: ACTION HUB (TIÊU ĐIỂM HÀNH ĐỘNG TINH GỌN)
      ───────────────────────────────────────────────────────────── */}
      <section aria-labelledby="action-hub-heading" className="relative rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 dark:from-[#121826] dark:to-[#0f1520] text-white p-6 sm:p-8 border border-slate-700 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span>{nextAction.stageTitle}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500 text-white">
                {nextAction.badge}
              </span>
            </div>

            <h2 id="action-hub-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
              {nextAction.actionText}
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
              Lộ trình thông minh tối ưu xác suất đỗ: Tập trung triệt tiêu rủi ro câu điểm liệt và củng cố phản xạ đề thi 30 câu chuẩn quy chế Cục CSGT.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={handleExecuteNextAction}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3.5 rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 active:scale-[0.98] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Play className="w-4 h-4 fill-current" aria-hidden="true" />
              <span>Bắt đầu ngay</span>
            </button>
            <button
              type="button"
              onClick={startRandomExam}
              className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 px-5 py-3.5 rounded-xl font-semibold text-sm border border-slate-700 active:scale-[0.98] transition touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <Award className="w-4 h-4 text-slate-300" aria-hidden="true" />
              <span>Thi thử 30 câu</span>
            </button>
          </div>
        </div>

        {/* Subtle decorative glow */}
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" aria-hidden="true"></div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          FAST-TRACK: THẺ ÔN CẤP TỐC 120 PHÚT (EMERGENCY / FAST TRACK)
      ───────────────────────────────────────────────────────────── */}
      <section aria-label="Lộ trình cấp tốc 120 phút" className="rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 dark:border-amber-500/20 p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/25 flex-shrink-0">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                ⚡ LỘ TRÌNH CẤP TỐC 120 PHÚT (CRAM-120)
              </span>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-amber-500/20 text-amber-800 dark:text-amber-300 font-mono">
                Cứu nguy sát giờ thi
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Tối Đa Xác Suất Đỗ Trong Đúng 120 Phút
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              Không học lan man 600 câu. Tập trung 100% vào: <strong>Chẩn đoán 60 câu điểm liệt</strong> • <strong>Vá đúng điểm yếu</strong> • <strong>2 bài thi thử mô phỏng đề thật</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCramIntro(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md shadow-orange-500/20 active:scale-95 transition flex-shrink-0"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Bắt đầu ôn 120 phút</span>
        </button>
      </section>

      {/* Modal giới thiệu & xác nhận */}
      {showCramIntro && (
        <CramIntroModal
          onStart={() => {
            setShowCramIntro(false);
            startCram();
          }}
          onCancel={() => setShowCramIntro(false)}
        />
      )}

      {/* ─────────────────────────────────────────────────────────────
          PHÂN KHU 2: UNIFIED COMPACT METRICS (BĂNG ĐO LƯỜNG TIẾN ĐỘ)
      ───────────────────────────────────────────────────────────── */}
      <section aria-label="Báo cáo tiến độ tổng hợp" className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-4 sm:p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          {/* KPI 1: Sẵn sàng thi */}
          <div className="pt-2 md:pt-0 md:px-3 first:pt-0 first:px-0">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span>Sẵn sàng thi</span>
              <Target className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {readiness.score}%
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                {readiness.rating}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 truncate">
              {examHistory.length === 0 ? (
                <span className="text-slate-400 dark:text-slate-500 font-medium">Chưa có bài thi thử</span>
              ) : readiness.recentCriticalMistakes === 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {Math.min(examHistory.length, 5)} đề gần nhất an toàn
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-medium">
                  {readiness.recentCriticalMistakes} đề dính câu liệt
                </span>
              )}
            </p>
          </div>

          {/* KPI 2: Điểm liệt */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setPracticeFilter({ status: 'all', criticalOnly: true });
              setView('practice');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setPracticeFilter({ status: 'all', criticalOnly: true });
                setView('practice');
              }
            }}
            className="pt-2 md:pt-0 md:px-3 cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span className="group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">60 Câu điểm liệt</span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                {criticalMasteredCount}
              </span>
              <span className="text-slate-400 text-sm font-medium font-mono">/60 câu</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2" aria-hidden="true">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(criticalMasteredCount / 60) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 3: Ngân hàng 600 câu */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              setPracticeFilter({ status: 'all' });
              setView('practice');
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                setPracticeFilter({ status: 'all' });
                setView('practice');
              }
            }}
            className="pt-2 md:pt-0 md:px-3 cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Tiến độ 600 câu</span>
              <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {attemptedCount}
              </span>
              <span className="text-slate-400 text-sm font-medium font-mono">/600</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">
                ({masteredCount} vững)
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2" aria-hidden="true">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${(masteredCount / totalQuestions) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* KPI 4: Lịch sử thi thử */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setView('fixed-exams')}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') setView('fixed-exams');
            }}
            className="pt-2 md:pt-0 md:px-3 cursor-pointer group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
              <span className="group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">Thi thử đã làm</span>
              <History className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
                {examHistory.filter(e => e.passed).length}
              </span>
              <span className="text-slate-400 text-sm font-medium font-mono">/{examHistory.length} đề đạt</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
              Tỷ lệ đỗ:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {examHistory.length > 0
                  ? `${Math.round((examHistory.filter(e => e.passed).length / examHistory.length) * 100)}%`
                  : 'Chưa thi'}
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          PHÂN KHU 3: HAI TRUNG TÂM HỌC TẬP & THI CỬ (TWO MAIN MODULES)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Module A: 6 Chương sát hạch chính thức (7 Cột) */}
        <section aria-labelledby="chapters-heading" className="lg:col-span-7 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div>
              <h3 id="chapters-heading" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                <span>6 Chương Lý Thuyết Sát Hạch</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Nội dung chuẩn hóa từ tài liệu Cục CSGT (CV 2262/CSGT-P5)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPracticeFilter({ status: 'all' });
                setView('practice');
              }}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded p-1"
            >
              <span>Xem tất cả</span>
              <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="space-y-2">
            {chapters.map(ch => {
              const chQuestions = questions.filter(q => q.chapterId === ch.id);
              const chMastered = chQuestions.filter(q => progressMap.get(q.id)?.status === 'mastered').length;
              const percent = Math.round((chMastered / ch.totalQuestions) * 100);

              return (
                <button
                  type="button"
                  key={ch.id}
                  onClick={() => handleSelectChapter(ch.id)}
                  className="w-full text-left p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex items-center justify-between gap-3 group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {ch.id}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                        {ch.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Câu {ch.fromQuestion}–{ch.toQuestion} ({ch.totalQuestions} câu)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right hidden sm:block">
                      <span className="text-xs font-bold font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {percent}%
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono tabular-nums">
                        {chMastered}/{ch.totalQuestions}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Module B: Chế độ Luyện đề & Ôn tập (5 Cột) */}
        <section aria-labelledby="exam-modes-heading" className="lg:col-span-5 bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <h3 id="exam-modes-heading" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Phòng Thi & Ôn Tập Câu Sai</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cấu trúc Blueprint 30 câu: Đạt ≥27/30 & Không sai câu điểm liệt
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Action 1: 18 Đề chuẩn */}
            <button
              type="button"
              onClick={() => setView('fixed-exams')}
              className="w-full text-left p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    18 Đề Mẫu Chuẩn Hạng B
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                  {fixedHistoryCount}/18 đề
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                18 đề thi cố định sinh từ Blueprint chuẩn với thuật toán seeded RNG.
              </p>
            </button>

            {/* Action 2: Thi ngẫu nhiên */}
            <button
              type="button"
              onClick={startRandomExam}
              className="w-full text-left p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                    Đề Thi Thử Ngẫu Nhiên
                  </h4>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300">
                  20 phút
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sinh đề ngẫu nhiên chuẩn cấu trúc 30 câu. Mục tiêu: Giữ streak 5 đề đỗ liên tiếp.
              </p>
            </button>

            {/* Action 3: Câu sai */}
            <button
              type="button"
              onClick={() => setView('review')}
              className="w-full text-left p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition group active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-rose-500" aria-hidden="true" />
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition">
                    Danh Sách Câu Sai & Điểm Liệt
                  </h4>
                </div>
                {reviewCount > 0 ? (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono tabular-nums">
                    {reviewCount} câu
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Sạch hàng đợi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tự động gom các câu từng làm sai hoặc chưa vững theo thuật toán Spaced Learning.
              </p>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
