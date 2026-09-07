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

// Single Source of Truth Question Map
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
  isCorrectHint?: boolean;
}

/**
 * Ghi nhận một lượt trả lời câu hỏi:
 * - Tự xác định tính đúng/sai từ Question Bank chính thức (Official Truth).
 * - Lưu immutable AttemptRecord vào db.attempts.
 * - Cập nhật materialized UserProgressItem trong db.progress.
 * - Đảm bảo Atomic Dexie Transaction.
 */
export async function recordAttempt({
  questionId,
  selectedOptionId,
  mode,
  sessionId,
  examId,
  timestamp = new Date().toISOString(),
  timeSpentMs,
  isCorrectHint
}: RecordAttemptParams): Promise<UserProgressItem> {
  const question = OFFICIAL_QUESTION_MAP.get(questionId);
  if (!question) {
    throw new Error(`[IntegrityError] Câu hỏi không tồn tại trong ngân hàng chính thức: ${questionId}`);
  }

  // Bất biến: mode cram-120 bắt buộc có sessionId
  if (mode === 'cram-120' && !sessionId) {
    throw new Error(`[IntegrityError] Attempt trong mode cram-120 bắt buộc phải có sessionId`);
  }

  // Tra cứu correctness thực tế từ ngân hàng câu hỏi
  const chosenOption = question.options.find(o => o.id === selectedOptionId);
  const calculatedIsCorrect = chosenOption ? chosenOption.isCorrect : false;

  if (isCorrectHint !== undefined && isCorrectHint !== calculatedIsCorrect) {
    console.warn(
      `[IntegrityWarning] Correctness mismatch cho câu ${questionId}. UI hint: ${isCorrectHint}, Truth: ${calculatedIsCorrect}`
    );
  }

  const isCorrect = calculatedIsCorrect;

  // Ghi atomically vào Dexie
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

/**
 * Nộp bài thi thử nguyên tử:
 * - Chấm điểm bài thi tạo ExamRecord (với mode và examType chuẩn).
 * - Dexie atomic transaction ghi: ExamRecord + các AttemptRecord (chỉ câu đã làm) + UserProgress.
 * - Xóa activeSession.
 */
export async function submitExamAtomically({
  activeSession,
  profile,
  questions,
  completedAt = new Date().toISOString(),
  mode = 'exam',
  examType = 'random',
  cramSessionId
}: SubmitExamAtomicallyParams): Promise<ExamRecord> {
  // 1. Chấm điểm bài thi
  const record = evaluateExam(activeSession, profile, questions, completedAt);
  record.mode = mode;
  record.examType = examType;

  // 2. Transaction nguyên tử ghi nhận toàn bộ kết quả vào Global Learning State
  await db.transaction('rw', db.examHistory, db.attempts, db.progress, db.activeSession, async () => {
    // A. Lưu bài thi
    await db.examHistory.put(record);

    // B. Ghi nhận attempts cho các câu user thực sự chọn đáp án (selectedOptionId !== undefined)
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

    // C. Xóa active session
    await db.activeSession.delete(activeSession.examId);
  });

  return record;
}

/**
 * Tái cấu trúc (Rebuild) toàn bộ UserProgress từ immutable AttemptHistory
 */
export async function rebuildProgressFromAttempts(): Promise<number> {
  const allAttempts = await db.attempts.toArray();
  // Sắp xếp theo timestamp tăng dần
  allAttempts.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const progressMap = new Map<string, UserProgressItem>();

  for (const att of allAttempts) {
    const base = progressMap.get(att.questionId) || createDefaultProgress(att.questionId);
    const updated = updateProgressOnAnswer(base, att.isCorrect, att.timestamp);
    progressMap.set(att.questionId, updated);
  }

  await db.transaction('rw', db.progress, async () => {
    await db.progress.clear();
    const items = Array.from(progressMap.values());
    if (items.length > 0) {
      await db.progress.bulkPut(items);
    }
  });

  return progressMap.size;
}
