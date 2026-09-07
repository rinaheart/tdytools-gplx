import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Award,
  BookOpen,
  Compass,
  History,
  Moon,
  Search,
  Settings,
  Sun
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setView,
    darkMode,
    toggleDarkMode,
    activeSession,
    resumeExamSession,
    cancelActiveSession
  } = useApp();

  const navLinks = [
    { id: 'dashboard', label: 'Tổng quan', icon: Compass },
    { id: 'practice', label: 'Luyện tập', icon: BookOpen },
    { id: 'fixed-exams', label: '18 Đề chuẩn', icon: Award },
    { id: 'review', label: 'Hàng đợi ôn', icon: History },
    { id: 'search', label: 'Tra cứu', icon: Search }
  ] as const;

  return (
    <>
      {/* 1. Header Static Bar (Bỏ ghim & nền bán trong suốt để tối đa không gian câu hỏi) */}
      <header className="relative z-20 bg-white dark:bg-[#090d16] border-b border-slate-200 dark:border-slate-800 transition-colors">
        {/* Active Session Alert Banner */}
        {activeSession && currentView !== 'exam' && (
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
              </span>
              <span className="truncate">
                Đang thi dở: <strong className="font-bold">{activeSession.title}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={resumeExamSession}
                className="bg-slate-950 text-amber-300 text-xs px-3 py-1 rounded-lg font-bold hover:bg-slate-900 active:scale-95 transition"
              >
                Tiếp tục làm bài
              </button>
              <button
                onClick={cancelActiveSession}
                className="text-xs text-slate-900 hover:text-white underline font-medium px-1"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <button
            type="button"
            onClick={() => setView('dashboard')}
            className="flex items-center gap-3 select-none group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl p-1"
            aria-label="Về trang chủ GPLX Hạng B"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform" aria-hidden="true">
              B
            </div>
            <div>
              <div className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>GPLX Hạng B</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                  CV 2262
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                600 câu sát hạch Cục CSGT
              </p>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav aria-label="Điều hướng chính" className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
            {navLinks.map(({ id, label, icon: Icon }) => {
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setView(id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-white dark:bg-[#121826] text-blue-600 dark:text-blue-400 shadow-sm border border-transparent dark:border-slate-800'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-2.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-target"
              aria-label={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              title={darkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" /> : <Moon className="w-4 h-4 text-slate-600" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => setView('settings')}
              className={`p-2.5 rounded-xl transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 touch-target ${
                currentView === 'settings'
                  ? 'bg-slate-100 dark:bg-slate-800/80 text-blue-600 dark:text-blue-400'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
              }`}
              aria-label="Cài đặt hệ thống"
              aria-current={currentView === 'settings' ? 'page' : undefined}
              title="Cài đặt & Sao lưu"
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Mobile Bottom Navigation Bar (Thumb-Zone Optimized) */}
      <nav aria-label="Điều hướng di động" className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-lg border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-around py-1 px-2 safe-area-bottom shadow-lg transition-colors">
        {navLinks.map(({ id, label, icon: Icon }) => {
          const isActive = currentView === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-xl ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" aria-hidden="true" />
              <span className="text-[10px] tracking-tight">{label}</span>
              {isActive && (
                <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" aria-hidden="true"></span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
