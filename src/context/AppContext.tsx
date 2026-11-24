import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type {
  Question,
  ExamProfile,
  UserProgressItem,
  ExamRecord,
  ActiveExamSession,
  ReadinessMetrics,
  NextBestAction,
  QuestionStatus,
  BackupData,
  ActivityMode,
  AttemptRecord,
  CramSession
} from '../types/quiz';
import {
  toggleBookmark as dbToggleBookmark,
  calculateReadinessMetrics,
  resolveNextBestAction
} from '../services/learningEngine';
import {
  generateExam,
  generateFixedTrainingExam,
  getFixedExamNumber,
  saveActiveSession,
  getActiveSession,
  clearActiveSession
} from '../services/examEngine';
import {
  recordAttempt,
  submitExamAtomically
} from '../services/attemptService';
import {
  startCramSession,
  loadActiveCramSession,
  saveCramSession
} from '../services/cramEngine';
import { db } from '../db/dexie';

import rawQuestions from '../../data/questions.json';
import rawManifest from '../../data/manifest.json';
import rawChapters from '../../data/chapters.json';

export type AppView =
  | 'dashboard'
  | 'practice'
  | 'exam'
  | 'result'
  | 'review'
  | 'fixed-exams'
  | 'exam-room'
  | 'search'
  | 'settings'
  | 'cram';

export interface PracticeFilter {
  chapterId?: number;
  status?: QuestionStatus | 'all';
  criticalOnly?: boolean;
  bookmarkedOnly?: boolean;
}

export interface AppContextType {
  questions: Question[];
  profile: ExamProfile;
  chapters: typeof rawChapters;
  progressMap: Map<string, UserProgressItem>;
  examHistory: ExamRecord[];
  activeSession: ActiveExamSession | null;
  cramSession: CramSession | null;
  currentView: AppView;
  darkMode: boolean;
  practiceFilter: PracticeFilter;
  selectedExamResult: ExamRecord | null;
  readiness: ReadinessMetrics;
  nextAction: NextBestAction;

  setView: (view: AppView) => void;
  toggleDarkMode: () => void;
  setPracticeFilter: React.Dispatch<React.SetStateAction<PracticeFilter>>;
  answerQuestion: (
    questionId: string,
    selectedOptionId: number,
    context?: { mode?: ActivityMode; sessionId?: string; examId?: string }
  ) => Promise<void>;
  toggleBookmark: (questionId: string) => Promise<void>;
  startRandomExam: () => void;
  startFixedExam: (examNumber: number) => void;
  recordExamAnswer: (questionId: string, optionId: number | undefined) => void;
  submitExam: () => Promise<void>;
  resumeExamSession: () => void;
  cancelActiveSession: () => Promise<void>;
  viewExamResult: (record: ExamRecord) => void;
  startCram: () => void;
  exitCram: () => void;
  updateCramSession: (session: CramSession) => Promise<void>;
  resetAllProgress: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (jsonString: string) => Promise<{ success: boolean; message: string }>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const questions = useMemo(() => rawQuestions as Question[], []);
  const profile = useMemo(() => rawManifest.examProfiles[0] as ExamProfile, []);
  const chapters = useMemo(() => rawChapters, []);

  const [progressMap, setProgressMap] = useState<Map<string, UserProgressItem>>(new Map());
  const [examHistory, setExamHistory] = useState<ExamRecord[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveExamSession | null>(null);
  const [cramSession, setCramSession] = useState<CramSession | null>(null);
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('tdy_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });
  const [practiceFilter, setPracticeFilter] = useState<PracticeFilter>({
    status: 'all'
  });
  const [selectedExamResult, setSelectedExamResult] = useState<ExamRecord | null>(null);

  const reloadGlobalStateFromDb = async () => {
    const [allProgress, history] = await Promise.all([
      db.progress.toArray(),
      db.examHistory.toArray()
    ]);
    const pMap = new Map<string, UserProgressItem>();
    for (const p of allProgress) {
      pMap.set(p.questionId, p);
    }
    setProgressMap(pMap);
    setExamHistory(history.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()));
  };

  useEffect(() => {
    async function initDb() {
      await reloadGlobalStateFromDb();

      const session = await getActiveSession();
      if (session && !session.isSubmitted) {
        setActiveSession(session);
      }

      const activeCram = await loadActiveCramSession();
      if (activeCram && activeCram.status === 'active') {
        setCramSession(activeCram);
      }
    }
    initDb();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('tdy_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('tdy_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  const readiness = useMemo(() => {
    return calculateReadinessMetrics(questions, progressMap, examHistory);
  }, [questions, progressMap, examHistory]);

  const fixedExamsCompletedCount = useMemo(() => {
    const completedNums = new Set<number>();
    for (const record of examHistory) {
      const num = getFixedExamNumber(record);
      if (num !== null) completedNums.add(num);
    }
    return completedNums.size;
  }, [examHistory]);

  const nextAction = useMemo(() => {
    return resolveNextBestAction(questions, progressMap, examHistory, fixedExamsCompletedCount);
  }, [questions, progressMap, examHistory, fixedExamsCompletedCount]);

  const handleAnswerQuestion = async (
    questionId: string,
    selectedOptionId: number,
    context?: { mode?: ActivityMode; sessionId?: string; examId?: string }
  ) => {
    const mode: ActivityMode = context?.mode || 'practice';
    const updated = await recordAttempt({
      questionId,
      selectedOptionId,
      mode,
      sessionId: context?.sessionId,
      examId: context?.examId
    });

    setProgressMap(prev => {
      const next = new Map(prev);
      next.set(questionId, updated);
      return next;
    });
  };

  const handleToggleBookmark = async (questionId: string) => {
    await dbToggleBookmark(questionId);
    const item = await db.progress.get(questionId);
    if (item) {
      setProgressMap(prev => {
        const next = new Map(prev);
        next.set(questionId, item);
        return next;
      });
    }
  };

  const startRandomExam = () => {
    const qIds = generateExam(profile, questions);
    const newSession: ActiveExamSession = {
      examId: `exam_${Date.now()}`,
      profileId: profile.id,
      title: `Đề thi ngẫu nhiên #${Math.floor(100 + Math.random() * 900)}`,
      questionBankVersionId: profile.questionBankVersionId,
      questionIds: qIds,
      startedAt: new Date().toISOString(),
      allocatedDurationSeconds: profile.durationMinutes * 60,
      answers: {},
      isSubmitted: false
    };
    setActiveSession(newSession);
    saveActiveSession(newSession);
    setCurrentView('exam');
  };

  const startFixedExam = (examNumber: number) => {
    const qIds = generateFixedTrainingExam(examNumber, profile, questions);
    const newSession: ActiveExamSession = {
      examId: `fixed_exam_${examNumber}_${Date.now()}`,
      profileId: profile.id,
      title: `Đề luyện chuẩn số ${examNumber}/18`,
      fixedExamNumber: examNumber,
      questionBankVersionId: profile.questionBankVersionId,
      questionIds: qIds,
      startedAt: new Date().toISOString(),
      allocatedDurationSeconds: profile.durationMinutes * 60,
      answers: {},
      isSubmitted: false
    };
    setActiveSession(newSession);
    saveActiveSession(newSession);
    setCurrentView('exam');
  };

  const recordExamAnswer = (questionId: string, optionId: number | undefined) => {
    if (!activeSession || activeSession.isSubmitted) return;
    const updated: ActiveExamSession = {
      ...activeSession,
      answers: {
        ...activeSession.answers,
        [questionId]: optionId
      }
    };
    setActiveSession(updated);
    saveActiveSession(updated);
  };

  const submitExam = async () => {
    if (!activeSession) return;
    const isFixed = activeSession.fixedExamNumber !== undefined || activeSession.examId.startsWith('fixed_');
    const resultRecord = await submitExamAtomically({
      activeSession,
      profile,
      questions,
      mode: 'exam',
      examType: isFixed ? 'fixed' : 'random'
    });

    await reloadGlobalStateFromDb();
    setActiveSession(null);
    setSelectedExamResult(resultRecord);
    setCurrentView('result');
  };

  const resumeExamSession = () => {
    if (activeSession) {
      setCurrentView('exam');
    }
  };

  const cancelActiveSession = async () => {
    if (activeSession) {
      await clearActiveSession(activeSession.examId);
      setActiveSession(null);
      setCurrentView('dashboard');
    }
  };

  const viewExamResult = (record: ExamRecord) => {
    setSelectedExamResult(record);
    setCurrentView('result');
  };

  const resetAllProgress = async () => {
    await db.transaction(
      'rw',
      [db.progress, db.examHistory, db.activeSession, db.cramSessions, db.attempts],
      async () => {
        await db.progress.clear();
        await db.examHistory.clear();
        await db.activeSession.clear();
        await db.cramSessions.clear();
        await db.attempts.clear();
      }
    );
    setProgressMap(new Map());
    setExamHistory([]);
    setActiveSession(null);
    setCramSession(null);
    setSelectedExamResult(null);
    setCurrentView('dashboard');
  };

  const exportBackup = async () => {
    const [allProgress, history, attempts, cramSessions] = await Promise.all([
      db.progress.toArray(),
      db.examHistory.toArray(),
      db.attempts.toArray(),
      db.cramSessions.toArray()
    ]);

    const progressRecord: Record<string, UserProgressItem> = {};
    const bookmarks: string[] = [];
    for (const p of allProgress) {
      progressRecord[p.questionId] = p;
      if (p.isBookmarked) bookmarks.push(p.questionId);
    }

    const backupData: BackupData = {
      schemaVersion: 2,
      appVersion: '1.3.0',
      exportedAt: new Date().toISOString(),
      progress: progressRecord,
      examHistory: history,
      attempts,
      cramSessions,
      bookmarks,
      settings: {
        darkMode
      }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tdytools-gplx-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (jsonString: string): Promise<{ success: boolean; message: string }> => {
    try {
      if (typeof jsonString !== 'string' || jsonString.length > 5 * 1024 * 1024) {
        return { success: false, message: 'Dung lượng file sao lưu vượt quá giới hạn cho phép (tối đa 5MB).' };
      }

      let rawData: unknown;
      try {
        rawData = JSON.parse(jsonString);
      } catch (parseErr: unknown) {
        const msg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        return { success: false, message: `Lỗi phân tích cú pháp JSON: ${msg}` };
      }

      if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return { success: false, message: 'File sao lưu không hợp lệ (không phải JSON object).' };
      }

      const data = rawData as Record<string, unknown>;

      if (data.schemaVersion !== 1 && data.schemaVersion !== 2) {
        return { success: false, message: 'Phiên bản schema sao lưu không được hỗ trợ (chỉ hỗ trợ v1 và v2).' };
      }

      if (!data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) {
        return { success: false, message: 'Dữ liệu tiến độ học (progress) bị thiếu hoặc không đúng định dạng.' };
      }

      if (!Array.isArray(data.examHistory)) {
        return { success: false, message: 'Dữ liệu lịch sử thi (examHistory) không phải dạng danh sách.' };
      }

      const bookmarkSet = new Set<string>(
        Array.isArray(data.bookmarks)
          ? data.bookmarks.filter((b): b is string => typeof b === 'string')
          : []
      );

      const progressEntries = Object.values(data.progress as Record<string, unknown>);
      const validProgressItems: UserProgressItem[] = [];
      for (const item of progressEntries) {
        if (!item || typeof item !== 'object') continue;
        const p = item as Record<string, unknown>;
        if (typeof p.questionId === 'string' && p.questionId.length > 0) {
          const progItem = item as UserProgressItem;
          if (bookmarkSet.has(progItem.questionId)) {
            progItem.isBookmarked = true;
          }
          validProgressItems.push(progItem);
        }
      }

      const validExamHistory: ExamRecord[] = [];
      for (const exam of data.examHistory) {
        if (!exam || typeof exam !== 'object') continue;
        const e = exam as Record<string, unknown>;
        if (typeof e.id === 'string' && typeof e.score === 'number') {
          validExamHistory.push(exam as ExamRecord);
        }
      }

      const validAttempts: AttemptRecord[] = [];
      if (Array.isArray(data.attempts)) {
        for (const att of data.attempts) {
          if (!att || typeof att !== 'object') continue;
          const a = att as Record<string, unknown>;
          if (typeof a.id === 'string' && typeof a.questionId === 'string') {
            validAttempts.push(att as AttemptRecord);
          }
        }
      }

      const validCramSessions: CramSession[] = [];
      if (Array.isArray(data.cramSessions)) {
        for (const cs of data.cramSessions) {
          if (!cs || typeof cs !== 'object') continue;
          const c = cs as Record<string, unknown>;
          if (typeof c.id === 'string' && c.mode === 'cram-120') {
            validCramSessions.push(cs as CramSession);
          }
        }
      }

      await db.transaction(
        'rw',
        [db.progress, db.examHistory, db.attempts, db.cramSessions, db.activeSession],
        async () => {
          await db.progress.clear();
          await db.examHistory.clear();
          await db.attempts.clear();
          await db.cramSessions.clear();
          await db.activeSession.clear();

          if (validProgressItems.length > 0) await db.progress.bulkPut(validProgressItems);
          if (validExamHistory.length > 0) await db.examHistory.bulkPut(validExamHistory);
          if (validAttempts.length > 0) await db.attempts.bulkPut(validAttempts);
          if (validCramSessions.length > 0) await db.cramSessions.bulkPut(validCramSessions);
        }
      );

      if (data.settings && typeof data.settings === 'object' && !Array.isArray(data.settings)) {
        const s = data.settings as Record<string, unknown>;
        if (typeof s.darkMode === 'boolean') {
          setDarkMode(s.darkMode);
        }
      }

      await reloadGlobalStateFromDb();
      setActiveSession(null);
      const activeCram = await loadActiveCramSession();
      setCramSession(activeCram && activeCram.status === 'active' ? activeCram : null);

      return {
        success: true,
        message: `Khôi phục thành công ${validProgressItems.length} tiến độ câu hỏi, ${validAttempts.length} lượt trả lời và ${validExamHistory.length} bài thi!`
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Lỗi khôi phục dữ liệu: ${message}` };
    }
  };

  const startCram = () => {
    const newSession = startCramSession(profile, questions, progressMap, examHistory);
    setCramSession(newSession);
    saveCramSession(newSession);
    setCurrentView('cram');
  };

  const exitCram = () => {
    setCurrentView('dashboard');
  };

  const updateCramSession = async (updated: CramSession) => {
    setCramSession(updated.status === 'abandoned' ? null : updated);
    try {
      await reloadGlobalStateFromDb();
    } catch (err) {
      console.warn('Lỗi khi đồng bộ examHistory/progressMap:', err);
    }
  };

  return (
    <AppContext.Provider
      value={{
        questions,
        profile,
        chapters,
        progressMap,
        examHistory,
        activeSession,
        cramSession,
        currentView,
        darkMode,
        practiceFilter,
        selectedExamResult,
        readiness,
        nextAction,
        setView: setCurrentView,
        toggleDarkMode,
        setPracticeFilter,
        answerQuestion: handleAnswerQuestion,
        toggleBookmark: handleToggleBookmark,
        startRandomExam,
        startFixedExam,
        recordExamAnswer,
        submitExam,
        resumeExamSession,
        cancelActiveSession,
        viewExamResult,
        startCram,
        exitCram,
        updateCramSession,
        resetAllProgress,
        exportBackup,
        importBackup
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
};
