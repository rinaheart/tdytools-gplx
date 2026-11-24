import type {
  Question,
  UserProgressItem,
  ExamRecord,
  ActiveExamSession,
  ExamProfile,
  AttemptRecord,
  ActivityMode
} from '../types/quiz';
import { db } from '../db/dexie';
import { createDefaultProgress, updateProgressOnAnswer } from './learningEngine';
import { evaluateExam } from './examEngine';
import rawQuestions from '../../data/questions.json';

const OFFICIAL_QUESTION_MAP = new Map<string, Question>(
  (rawQuestions as Question[]).map(q => [q.id, q])
);

export interface RecordAttemptParams {
  questionId: string;
  selectedOptionId: number;
  mode: ActivityMode;
  sessionId?: string;
  examId?: string;
  timestamp?: string;
  timeSpentMs?: number;
}

/**
 * Ghi nhận một lượt trả lời câu hỏi nguyên tử:
 * - Xác định đúng/sai trực tiếp từ ngân hàng câu hỏi gốc (Official Truth).
 * - Lưu phương án thực tế selectedOptionId vào db.attempts và cập nhật db.progress trong 1 transaction.
 */
export async function recordAttempt({
  questionId,
  selectedOptionId,
  mode,
  sessionId,
  examId,
  timestamp = new Date().toISOString(),
  timeSpentMs
}: RecordAttemptParams): Promise<UserProgressItem> {
  const question = OFFICIAL_QUESTION_MAP.get(questionId);
  if (!question) {
    throw new Error(`[IntegrityError] Câu hỏi không tồn tại trong ngân hàng chính thức: ${questionId}`);
  }

  if (mode === 'cram-120' && !sessionId) {
    throw new Error('[IntegrityError] Attempt trong mode cram-120 bắt buộc phải có sessionId');
  }

  const chosenOption = question.options.find(o => o.id === selectedOptionId);
  const isCorrect = chosenOption ? chosenOption.isCorrect : false;

  return await db.transaction('rw', db.attempts, db.progress, async () => {
    const attempt: AttemptRecord = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      questionId,
      selectedOptionId,
      isCorrect,
      mode,
      sessionId,
      examId,
      timestamp,
      timeSpentMs
    };

    await db.attempts.add(attempt);

    const existing = await db.progress.get(questionId);
    const base = existing || createDefaultProgress(questionId);
    const updated = updateProgressOnAnswer(base, isCorrect, timestamp);

    await db.progress.put(updated);
    return updated;
  });
}

export interface SubmitExamAtomicallyParams {
  activeSession: ActiveExamSession;
  profile: ExamProfile;
  questions: Question[];
  completedAt?: string;
  mode?: 'exam' | 'cram-120';
  examType?: 'random' | 'fixed';
  cramSessionId?: string;
}

export async function submitExamAtomically({
  activeSession,
  profile,
  questions,
  completedAt = new Date().toISOString(),
  mode = 'exam',
  examType = 'random',
  cramSessionId
}: SubmitExamAtomicallyParams): Promise<ExamRecord> {
  const record = evaluateExam(activeSession, profile, questions, completedAt);
  record.mode = mode;
  record.examType = examType;

  await db.transaction('rw', db.examHistory, db.attempts, db.progress, db.activeSession, async () => {
    await db.examHistory.put(record);

    const answeredEntries = Object.entries(record.answers).filter(([_, ans]) => ans.selectedOptionId !== undefined);

    if (answeredEntries.length > 0) {
      const qIds = answeredEntries.map(([qId]) => qId);
      const existingItems = await db.progress.where('questionId').anyOf(qIds).toArray();
      const existingMap = new Map(existingItems.map(item => [item.questionId, item]));

      const attemptsToInsert: AttemptRecord[] = [];
      const progressToPut: UserProgressItem[] = [];

      for (const [qId, ans] of answeredEntries) {
        attemptsToInsert.push({
          id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          questionId: qId,
          selectedOptionId: ans.selectedOptionId!,
          isCorrect: ans.isCorrect,
          mode,
          sessionId: cramSessionId,
          examId: record.id,
          timestamp: completedAt
        });

        const base = existingMap.get(qId) || createDefaultProgress(qId);
        const updated = updateProgressOnAnswer(base, ans.isCorrect, completedAt);
        progressToPut.push(updated);
      }

      await db.attempts.bulkAdd(attemptsToInsert);
      await db.progress.bulkPut(progressToPut);
    }

    await db.activeSession.delete(activeSession.examId);
  });

  return record;
}
