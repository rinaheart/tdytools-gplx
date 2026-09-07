import Dexie, { type EntityTable } from 'dexie';
import type {
  UserProgressItem,
  ExamRecord,
  ActiveExamSession,
  CramSession,
  AttemptRecord
} from '../types/quiz';

export interface SettingItem {
  key: string;
  value: unknown;
}

export class GplxDatabase extends Dexie {
  progress!: EntityTable<UserProgressItem, 'questionId'>;
  examHistory!: EntityTable<ExamRecord, 'id'>;
  activeSession!: EntityTable<ActiveExamSession, 'examId'>;
  cramSessions!: EntityTable<CramSession, 'id'>;
  attempts!: EntityTable<AttemptRecord, 'id'>;
  settings!: EntityTable<SettingItem, 'key'>;

  // Alias để code có thể dùng db.userProgress tương đương db.progress
  get userProgress(): EntityTable<UserProgressItem, 'questionId'> {
    return this.progress;
  }

  constructor() {
    super('GplxDatabase_v1');
    // Version 1 ban đầu
    this.version(1).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed',
      activeSession: 'examId, profileId, startedAt',
      settings: 'key'
    });
    // Version 2 bổ sung cramSessions
    this.version(2).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed',
      activeSession: 'examId, profileId, startedAt',
      cramSessions: 'id, status, startedAt, currentStage',
      settings: 'key'
    });
    // Version 3 bổ sung attempts (immutable event log) & taxonomy index
    this.version(3).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed, mode, examType',
      activeSession: 'examId, profileId, startedAt',
      cramSessions: 'id, status, startedAt, currentStage',
      attempts: 'id, questionId, timestamp, mode, sessionId, examId',
      settings: 'key'
    }).upgrade(async tx => {
      // Backfill default values cho các bản ghi lịch sử thi cũ
      await tx.table('examHistory').toCollection().modify((record: Partial<ExamRecord>) => {
        if (!record.mode) {
          record.mode = 'exam';
        }
        if (!record.examType) {
          record.examType = record.profileId?.startsWith('b-fixed') ? 'fixed' : 'random';
        }
      });
    });
  }
}

export const db = new GplxDatabase();
