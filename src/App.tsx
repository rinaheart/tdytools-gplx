import React, { Suspense, lazy } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { PracticeView } from './components/PracticeView';
import { ExamView } from './components/ExamView';
import { ExamResultView } from './components/ExamResultView';
import { ReviewQueueView } from './components/ReviewQueueView';
import { FixedExamsView } from './components/FixedExamsView';
import { ExamRoomView } from './components/ExamRoomView';
import { SearchView } from './components/SearchView';
import { SettingsView } from './components/SettingsView';

const Cram120Container = lazy(() =>
  import('./features/cram/Cram120Container').then(m => ({ default: m.Cram120Container }))
);

export const AppContent: React.FC = () => {
  const {
    currentView,
    activeSession,
    resumeExamSession,
    cancelActiveSession,
    cramSession,
    questions,
    profile,
    progressMap,
    examHistory,
    answerQuestion,
    exitCram,
    updateCramSession,
    setView
  } = useApp();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-200">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-2xl shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
      >
        Bỏ qua đến nội dung chính
      </a>

      {currentView !== 'cram' && <Sidebar />}

      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {activeSession && currentView !== 'exam' && currentView !== 'cram' && (
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

        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 w-full mx-auto safe-area-bottom focus:outline-none ${
            currentView === 'cram'
              ? 'p-0'
              : 'max-w-5xl px-2 sm:px-6 lg:px-8 py-2.5 sm:py-5 pb-16 sm:pb-24 md:pb-8'
          }`}
        >
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'practice' && <PracticeView />}
          {currentView === 'exam' && <ExamView />}
          {currentView === 'result' && <ExamResultView />}
          {currentView === 'review' && <ReviewQueueView />}
          {currentView === 'fixed-exams' && <FixedExamsView />}
          {currentView === 'exam-room' && <ExamRoomView />}
          {currentView === 'search' && <SearchView />}
          {currentView === 'settings' && <SettingsView />}
          {currentView === 'cram' && cramSession && (
            <Suspense
              fallback={
                <div className="p-12 text-center text-sm font-semibold text-slate-500">
                  Đang mở lộ trình Cấp tốc 120 phút...
                </div>
              }
            >
              <Cram120Container
                session={cramSession}
                questions={questions}
                profile={profile}
                examHistory={examHistory}
                progressMap={progressMap}
                onRecordAnswer={answerQuestion}
                onExitCram={exitCram}
                onUpdateSession={updateCramSession}
                onOpenReview={() => setView('review')}
              />
            </Suspense>
          )}
        </main>
      </div>
    </div>
  );
};

export default AppContent;
