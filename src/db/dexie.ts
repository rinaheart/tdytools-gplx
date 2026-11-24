import Dexie, { type EntityTable } from 'dexie';
import type {
  UserProgressItem,
  ExamRecord,
  ActiveExamSession,
  CramSession,
  AttemptRecord
} from '../types/quiz';

export class GplxDatabase extends Dexie {
  progress!: EntityTable<UserProgressItem, 'questionId'>;
  examHistory!: EntityTable<ExamRecord, 'id'>;
  activeSession!: EntityTable<ActiveExamSession, 'examId'>;
  cramSessions!: EntityTable<CramSession, 'id'>;
  attempts!: EntityTable<AttemptRecord, 'id'>;

  constructor() {
    super('GplxDatabase_v1');
    // Giữ nguyên chuỗi version 1 -> 3 để tương thích ngược tuyệt đối với IndexedDB trên trình duyệt khách hàng hiện hữu
    this.version(1).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed',
      activeSession: 'examId, profileId, startedAt',
      settings: 'key'
    });
    this.version(2).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed',
      activeSession: 'examId, profileId, startedAt',
      cramSessions: 'id, status, startedAt, currentStage',
      settings: 'key'
    });
    this.version(3).stores({
      progress: 'questionId, status, consecutiveCorrect, isBookmarked, lastAttemptAt',
      examHistory: 'id, profileId, completedAt, score, passed, mode, examType',
      activeSession: 'examId, profileId, startedAt',
      cramSessions: 'id, status, startedAt, currentStage',
      attempts: 'id, questionId, timestamp, mode, sessionId, examId',
      settings: 'key'
    }).upgrade(async tx => {
      await tx.table('examHistory').toCollection().modify((record: Partial<ExamRecord>) => {
        if (!record.mode) {
          record.mode = 'exam';
        }
        if (!record.examType) {
          record.examType = record.title?.startsWith('Đề luyện chuẩn') ? 'fixed' : 'random';
        }
      });
    });
  }
}

export const db = new GplxDatabase();
