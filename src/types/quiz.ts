import type { CramSession } from './cram';

export interface Option {
  id: number;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string; // "q-1" -> "q-600"
  questionNumber: number; // 1 -> 600
  chapterId: number; // 1 -> 6
  chapterName: string;
  category: 'rules' | 'culture' | 'drivingTechnique' | 'structureRepair' | 'signs' | 'scenario';
  content: string;
  contentHash: string; // SHA-256
  image?: {
    src: string;
    type: 'sign' | 'scenario' | 'diagram' | 'other';
  };
  options: Option[];
  isCritical: boolean;
  criticalSetId?: string;
  source: {
    document: string;
    page: number;
  };
}

export type ExamQuestionPool =
  | { type: 'category'; category: Question['category'] }
  | { type: 'critical'; criticalSetId: string };

export interface ExamBlueprintSlot {
  id: string;
  pool: ExamQuestionPool;
  questionCount: number;
}

export interface ProfileSnapshot {
  questionCount: number;
  durationMinutes: number;
  passingScore: number;
  criticalQuestionCount?: number;
  criticalMistakeFails?: boolean;
  blueprint: ExamBlueprintSlot[];
}

export type ExamProfileStatus = 'active' | 'future' | 'placeholder' | 'deprecated';

export interface ExamProfile {
  id: string;
  status: ExamProfileStatus;
  licenseClass: 'B';
  title: string;
  questionBankVersionId: string;
  criticalSetId?: string;
  effectiveFrom: string;
  effectiveUntil?: string;
  questionCount: number;
  durationMinutes: number;
  passingScore: number;
  criticalQuestionCount?: number;
  criticalMistakeFails?: boolean;
  blueprint?: ExamBlueprintSlot[];
}

export interface ExamModePolicy {
  showCriticalBadge: boolean;
  showExplanation: boolean;
}

export const PRACTICE_MODE_POLICY: ExamModePolicy = {
  showCriticalBadge: true,
  showExplanation: true
};

export const EXAM_MODE_POLICY: ExamModePolicy = {
  showCriticalBadge: false, // Blind-to-critical: Giấu hoàn toàn nhãn điểm liệt khi thi thử
  showExplanation: false
};

export type QuestionStatus = 'unseen' | 'learning' | 'review' | 'mastered';

export interface UserProgressItem {
  questionId: string;
  attempts: number;
  correctCount: number;
  incorrectCount: number;
  consecutiveCorrect: number;
  consecutiveIncorrect: number;
  status: QuestionStatus;
  isBookmarked: boolean;
  firstAttemptAt?: string;
  lastAttemptAt?: string;
  lastCorrectAt?: string;
}

export interface ActiveExamSession {
  examId: string;
  profileId: string;
  title: string;
  fixedExamNumber?: number;
  questionBankVersionId: string;
  questionIds: string[];
  startedAt: string;
  allocatedDurationSeconds: number;
  answers: Record<string, number | undefined>;
  isSubmitted: boolean;
}

export type ActivityMode =
  | 'practice'
  | 'critical-review'
  | 'exam'
  | 'cram-120';

export interface AttemptRecord {
  id: string;
  questionId: string;
  selectedOptionId: number;
  isCorrect: boolean;
  mode: ActivityMode;
  sessionId?: string;
  examId?: string;
  timestamp: string;
  timeSpentMs?: number;
}

export interface ExamRecord {
  id: string;
  profileId: string;
  title: string;
  fixedExamNumber?: number;
  mode?: 'exam' | 'cram-120';
  examType?: 'random' | 'fixed';
  questionBankVersionId: string;
  profileSnapshot: ProfileSnapshot;
  questionIds: string[];
  generatedAt: string;
  startedAt: string;
  completedAt: string;
  allocatedDurationSeconds: number;
  actualDurationSeconds: number;
  score: number;
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  passed: boolean;
  hasCriticalMistake: boolean;
  criticalQuestionId?: string;
  answers: Record<string, {
    selectedOptionId?: number;
    isCorrect: boolean;
    isCritical: boolean;
  }>;
}

export interface BackupData {
  schemaVersion: 1 | 2;
  appVersion: string;
  exportedAt: string;
  progress: Record<string, UserProgressItem>;
  examHistory: ExamRecord[];
  attempts?: AttemptRecord[];
  cramSessions?: CramSession[];
  bookmarks: string[];
  settings: Record<string, unknown>;
}

export type LearningStage =
  | 'critical-foundation'
  | 'bank-foundation'
  | 'topic-reinforcement'
  | 'fixed-exams'
  | 'random-exams'
  | 'speed-training';

export interface NextBestAction {
  stage: LearningStage;
  stageTitle: string;
  actionText: string;
  badge: string;
  targetMode: 'practice' | 'exam' | 'review' | 'fixed-exams';
  filterParam?: string;
}

export interface ReadinessMetrics {
  score: number; // 0..100
  rating: 'CẦN HỌC NỀN TẢNG' | 'ĐANG CỦNG CỐ' | 'GẦN SẴN SÀNG' | 'MỨC ĐỘ SẴN SÀNG: CAO';
  criticalMasteryRate: number; // 0..1
  examPassRateLast5: number; // 0..1
  bankMasteryRate: number; // 0..1
  recentCriticalMistakes: number;
}

export * from './cram';
