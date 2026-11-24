import type { Question } from './quiz';

export type CramSessionStatus = 'active' | 'completed' | 'expired' | 'abandoned';

export type CramStage =
  | 'critical-triage'
  | 'critical-repair'
  | 'exam-1'
  | 'analysis'
  | 'weakness-sprint'
  | 'exam-2'
  | 'final-check';

export interface CramBudget {
  criticalTriage: number; // 900s (15 min)
  criticalRepair: number; // 1200s (20 min)
  analysis: number;       // 600s (10 min)
  weaknessSprint: number; // 1500s (25 min)
  finalCheck: number;     // 600s (10 min)
  exam1: 1200;            // Invariant: 1200s (20 min)
  exam2: 1200;            // Invariant: 1200s (20 min)
  total: 7200;            // Invariant: 7200s (120 min)
}

export type CramReadinessLevel = 'not-ready' | 'borderline' | 'good' | 'high';

export interface CramReadinessResult {
  level: CramReadinessLevel;
  exam1Score?: number;
  exam2Score?: number;
  criticalFinalErrors: number;
  criticalRepairRemaining: number;
  summaryText: string;
  nextActionRecommendation: string;
}

export interface CramBaseline {
  criticalMastered: number;
  masteredCount: number;
  reviewCount: number;
  readinessLevel?: CramReadinessLevel;
  readinessScore?: number;
}

export interface CramActiveExamDraft {
  examNumber: 1 | 2;
  startedAt: string;
  pausedAt?: string;
  totalPausedSeconds: number;
  answers: Record<string, number | undefined>;
  currentIndex: number;
}

export interface CramSession {
  id: string;
  mode: 'cram-120';
  profileId: string;

  status: CramSessionStatus;
  currentStage: CramStage;
  stageCursor?: number;

  startedAt: string;
  deadlineAt: string;
  completedAt?: string;

  baseline?: CramBaseline;

  isPaused: boolean;
  pausedAt?: string;
  totalPausedSeconds: number;

  sessionSeed: number;
  exam1Seed: number;
  exam2Seed: number;

  budget: CramBudget;
  stageStartedAt: string;

  triageAnsweredIds: string[];
  triageMistakeIds: string[];

  criticalRepairRemainingIds: string[];

  exam1Id?: string;
  exam1MistakeIds: string[];

  exam2Id?: string;
  exam2MistakeIds: string[];

  weakQuestionIds: string[];

  finalCheckRemainingIds: string[];

  activeCramExam?: CramActiveExamDraft;

  readiness?: CramReadinessResult;
}

export interface CategoryMistakeSummary {
  total: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export interface ExamAnalysisResult {
  score: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  criticalMistake: boolean;
  byCategory: Record<Question['category'], CategoryMistakeSummary>;
  mistakeQuestionIds: string[];
}
