import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Compass,
  Flame,
  History,
  Moon,
  Search,
  Settings,
  Sun
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setView,
    darkMode,
    toggleDarkMode,
    activeSession,
    resumeExamSession,
    questions,
    progressMap
  } = useApp();

  const reviewCount = React.useMemo(() => {
    if (!questions || !progressMap) return 0;
    return questions.filter(q => progressMap.get(q.id)?.status === 'review').length;
  }, [questions, progressMap]);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('gplx_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebarCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('gplx_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Desktop: 6 tabs riêng biệt
  const desktopNavLinks = [
    { id: 'dashboard', label: 'Tổng quan', icon: Compass },
    { id: 'practice', label: 'Ôn tập', icon: BookOpen },
    { id: 'fixed-exams', label: 'Đề mẫu', icon: Award },
    { id: 'exam-room', label: 'Phòng thi', icon: Flame },
    { id: 'review', label: 'Câu sai', icon: History },
    { id: 'search', label: 'Tìm kiếm', icon: Search }
  ] as const;

  // Mobile: 5 tabs, Phòng thi dẫn tới Selector Hub
  const mobileNavLinks = [
    { id: 'dashboard', label: 'Tổng quan', icon: Compass },
    { id: 'practice', label: 'Ôn tập', icon: BookOpen },
    { id: 'exam-room', label: 'Phòng thi', icon: Flame },
    { id: 'review', label: 'Câu sai', icon: History },
    { id: 'search', label: 'Tìm kiếm', icon: Search }
  ] as const;

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (md:flex) - Đặt bên trái, giải phóng 100% chiều cao cho câu hỏi
      ───────────────────────────────────────────────────────────── */}
      <aside
        aria-label="Thanh điều hướng bên trái"
        className={`hidden md:flex flex-col justify-between sticky top-0 h-screen bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800 transition-all duration-200 z-30 select-none flex-shrink-0 ${
          isCollapsed ? 'w-18' : 'w-56 lg:w-60'
        }`}
      >
        {/* Top Header & Brand */}
        <div>
          <div className={`p-3.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center ${isCollapsed ? 'flex-col gap-2.5 justify-center' : 'justify-between'}`}>
            <button
              type="button"
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl"
              aria-label="Về trang chủ GPLX Hạng B"
              title="Về trang chủ GPLX Hạng B"
            >
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform flex-shrink-0"
                aria-hidden="true"
              >
                B
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                    <span>GPLX Hạng B</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                      CV 2262
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium truncate">
                    600 câu sát hạch CSGT
                  </p>
                </div>
              )}
            </button>

            {/* Nút thu gọn / mở rộng đặt ở TOP */}
            <button
              type="button"
              onClick={toggleSidebarCollapse}
              title={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              aria-label={isCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'}
              aria-expanded={!isCollapsed}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* Nav Links List */}
          <nav aria-label="Menu chức năng" className="p-2 space-y-1 mt-2">
            {desktopNavLinks.map(({ id, label, icon: Icon }) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={isActive ? 'page' : undefined}
                  title={isCollapsed ? label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isCollapsed ? 'justify-center' : 'justify-start'
                  } ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold border border-blue-200/50 dark:border-blue-500/30 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} aria-hidden="true" />
                  {!isCollapsed && <span className="truncate flex-1 text-left">{label}</span>}
                  {!isCollapsed && id === 'review' && reviewCount > 0 && (
                    <span className="bg-rose-500/15 text-rose-600 dark:text-rose-400 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                      {reviewCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions: Active session indicator, Dark Mode, Settings, Collapse toggle */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1">
          {/* Active Exam Session Mini Badge */}
          {activeSession && currentView !== 'exam' && (
            <button
              type="button"
              onClick={resumeExamSession}
              title={`Đang thi dở: ${activeSession.title}`}
              className={`w-full mb-2 bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-300 rounded-xl p-2 flex items-center gap-2 hover:bg-amber-500/25 transition text-left ${
                isCollapsed ? 'justify-center' : ''
              }`}
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-600"></span>
              </span>
              {!isCollapsed && (
                <div className="overflow-hidden">
                  <div className="text-[11px] font-bold truncate">Tiếp tục bài thi</div>
                  <div className="text-[10px] text-amber-700 dark:text-amber-400 truncate">{activeSession.title}</div>
                </div>
              )}
            </button>
          )}

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition ${
              isCollapsed ? 'justify-center' : 'justify-start'
            }`}
          >
            {darkMode ? (
              <Sun className="w-4 h-4 text-amber-400 flex-shrink-0" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 flex-shrink-0" aria-hidden="true" />
            )}
            {!isCollapsed && <span>{darkMode ? 'Giao diện Sáng' : 'Giao diện Tối'}</span>}
          </button>

          {/* Settings Button */}
          <button
            type="button"
            onClick={() => setView('settings')}
            title="Cài đặt & Sao lưu"
            aria-current={currentView === 'settings' ? 'page' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition ${
              isCollapsed ? 'justify-center' : 'justify-start'
            } ${
              currentView === 'settings'
                ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {!isCollapsed && <span>Cài đặt & Sao lưu</span>}
          </button>
        </div>
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE TOP SLIM BAR (md:hidden) - Chiều cao chỉ 46px siêu gọn
      ───────────────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 px-3.5 h-11 flex items-center justify-between flex-shrink-0">
        <button
          type="button"
          onClick={() => setView('dashboard')}
          className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-extrabold text-sm shadow-sm">
            B
          </div>
          <span>GPLX Hạng B</span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold">
            CV 2262
          </span>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
          <button
            type="button"
            onClick={() => setView('settings')}
            className={`p-1.5 rounded-lg ${currentView === 'settings' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}
            aria-label="Cài đặt"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          3. MOBILE BOTTOM NAVIGATION (Floating Island Dock - Thumb-Zone)
      ───────────────────────────────────────────────────────────── */}
      <nav
        aria-label="Điều hướng di động"
        className="md:hidden fixed bottom-2.5 inset-x-2.5 sm:inset-x-4 max-w-lg mx-auto z-40 bg-white/92 dark:bg-[#0c1220]/92 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.18)] dark:shadow-[0_12px_36px_-8px_rgba(0,0,0,0.7)] flex items-center justify-between gap-1 transition-all duration-300 before:absolute before:inset-x-6 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/60 dark:before:via-white/15 before:to-transparent pointer-events-auto"
      >
        {mobileNavLinks.map(({ id, label, icon: Icon }) => {
          const isActive = id === 'exam-room'
            ? (currentView === 'exam-room' || currentView === 'fixed-exams')
            : (currentView === id);
          const isReview = id === 'review';
          const isExam = id === 'exam-room';
          const hasReviewItems = isReview && reviewCount > 0;
          const hasActiveExam = isExam && !!activeSession;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[46px] py-1 px-1 rounded-xl transition-all duration-200 relative group active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/35 font-bold scale-[1.02]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Icon Container with Badge */}
              <div className="relative flex items-center justify-center">
                <Icon
                  className={`w-5 h-5 mb-0.5 transition-transform duration-200 ${
                    isActive ? 'scale-105 stroke-[2.2]' : 'stroke-[1.8] group-hover:scale-105'
                  }`}
                  aria-hidden="true"
                />

                {/* Review Queue Badge */}
                {hasReviewItems && (
                  <span
                    className={`absolute -top-1 -right-2.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-mono font-extrabold flex items-center justify-center leading-none shadow-sm ${
                      isActive
                        ? 'bg-white text-rose-600'
                        : 'bg-rose-500 text-white'
                    }`}
                    title={`${reviewCount} câu cần ôn lại`}
                  >
                    {reviewCount > 99 ? '99+' : reviewCount}
                  </span>
                )}

                {/* Active Exam Pulse Dot */}
                {hasActiveExam && (
                  <span className="absolute -top-0.5 -right-1.5 flex h-2 w-2" title="Đang có bài thi dở">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] tracking-tight leading-none ${
                  isActive ? 'text-white font-bold' : 'font-medium'
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
