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

export interface CramSession {
  id: string;
  mode: 'cram-120';
  profileId: string;

  status: CramSessionStatus;
  currentStage: CramStage;

  startedAt: string;
  deadlineAt: string;
  completedAt?: string;

  // Baseline trước khi thực hiện attempt đầu tiên của phiên
  baseline?: CramBaseline;

  // Hỗ trợ Tạm dừng theo yêu cầu của user
  isPaused: boolean;
  pausedAt?: string;
  totalPausedSeconds: number;

  sessionSeed: number;
  exam1Seed: number;
  exam2Seed: number;

  budget: CramBudget;
  stageStartedAt: string;

  // Snapshot câu hỏi của từng phần
  triageAnsweredIds: string[];
  triageMistakeIds: string[];

  criticalRepairRemainingIds: string[];

  exam1Id?: string;
  exam1MistakeIds: string[];

  exam2Id?: string;
  exam2MistakeIds: string[];

  weakQuestionIds: string[];

  finalCheckRemainingIds: string[];

  readiness?: CramReadinessResult;
}

export interface CramQueueItem {
  questionId: string;
  reason:
    | 'critical-mistake'
    | 'repeated-mistake'
    | 'low-accuracy'
    | 'exam-mistake'
    | 'unseen';
  priority: number;
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
