import type {
  Question,
  ExamProfile,
  ActiveExamSession,
  ExamRecord,
  ProfileSnapshot
} from '../types/quiz';
import { db } from '../db/dexie';

export function createSeededRandom(seed: number): () => number {
  let s = Math.floor(seed) >>> 0;
  return function mulberry32(): number {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sample<T>(pool: T[], count: number, rng: () => number): T[] {
  if (count > pool.length) {
    throw new Error(`Không đủ phần tử trong pool để lấy ${count} mẫu (có ${pool.length})`);
  }
  const cloned = [...pool];
  const result: T[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * cloned.length);
    result.push(cloned[idx]);
    cloned.splice(idx, 1);
  }
  return result;
}

export function shuffleArray<T>(array: T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function resolveExamProfile(
  licenseClass: 'B',
  targetDate: string,
  profiles: ExamProfile[]
): ExamProfile {
  const match = profiles.find(p => {
    if (p.licenseClass !== licenseClass) return false;
    if (p.status === 'placeholder' || p.status === 'deprecated') return false;
    const afterStart = p.effectiveFrom <= targetDate;
    const beforeEnd = !p.effectiveUntil || targetDate <= p.effectiveUntil;
    return afterStart && beforeEnd;
  });

  if (!match) {
    throw new Error(`Không tìm thấy hồ sơ sát hạch hợp lệ cho hạng ${licenseClass} tại ngày ${targetDate}`);
  }
  return match;
}

export function generateExam(
  profile: ExamProfile,
  allQuestions: Question[],
  seed?: number
): string[] {
  if (profile.status === 'placeholder' || !profile.blueprint) {
    throw new Error(`Profile ${profile.id} là placeholder, chưa thể sinh đề.`);
  }

  const rng = seed !== undefined ? createSeededRandom(seed) : Math.random;
  const selectedIds = new Set<string>();
  const examQuestionIds: string[] = [];

  // P0.2: Rút slot critical trước và bắt buộc match criticalSetId
  for (const slot of profile.blueprint) {
    if (slot.pool.type === 'critical') {
      const requiredSetId = slot.pool.criticalSetId;
      const criticalCandidates = allQuestions.filter(
        q => q.isCritical && q.criticalSetId === requiredSetId && !selectedIds.has(q.id)
      );
      if (criticalCandidates.length < slot.questionCount) {
        throw new Error(`Không đủ câu điểm liệt thuộc set ${requiredSetId}`);
      }
      const chosen = sample(criticalCandidates, slot.questionCount, rng);
      for (const q of chosen) {
        selectedIds.add(q.id);
        examQuestionIds.push(q.id);
      }
    }
  }

  // P0.1: Rút các slot category (loại trừ toàn bộ câu điểm liệt để đảm bảo đúng 1 câu điểm liệt duy nhất)
  for (const slot of profile.blueprint) {
    if (slot.pool.type === 'category') {
      const targetCategory = slot.pool.category;
      const categoryCandidates = allQuestions.filter(
        q => q.category === targetCategory && !q.isCritical && !selectedIds.has(q.id)
      );
      if (categoryCandidates.length < slot.questionCount) {
        throw new Error(`Không đủ câu hỏi cho nhóm ${targetCategory}`);
      }
      const chosen = sample(categoryCandidates, slot.questionCount, rng);
      for (const q of chosen) {
        selectedIds.add(q.id);
        examQuestionIds.push(q.id);
      }
    }
  }

  // Trộn toàn bộ đề bằng RNG đã inject
  return shuffleArray(examQuestionIds, rng);
}

export function generateFixedTrainingExam(
  examNumber: number, // 1 -> 18
  profile: ExamProfile,
  allQuestions: Question[]
): string[] {
  const seed = 10000 + examNumber;
  return generateExam(profile, allQuestions, seed);
}

export function evaluateExam(
  session: ActiveExamSession,
  profile: ExamProfile,
  allQuestions: Question[],
  completedAtIso: string = new Date().toISOString()
): ExamRecord {
  const qMap = new Map(allQuestions.map(q => [q.id, q]));
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let hasCriticalMistake = false;
  let criticalQuestionId: string | undefined = undefined;

  const answersRecord: ExamRecord['answers'] = {};

  for (const qid of session.questionIds) {
    const q = qMap.get(qid);
    if (!q) continue;

    const selectedOptionId = session.answers[qid];
    const isAnswered = selectedOptionId !== undefined;
    const correctOption = q.options.find(o => o.isCorrect);

    let isCorrect = false;
    if (isAnswered && correctOption && selectedOptionId === correctOption.id) {
      isCorrect = true;
      correctCount++;
    } else {
      isCorrect = false;
      if (isAnswered) incorrectCount++;
      else unansweredCount++;
    }

    if (q.isCritical) {
      criticalQuestionId = q.id;
      if (!isCorrect) {
        hasCriticalMistake = true;
      }
    }

    answersRecord[qid] = {
      selectedOptionId,
      isCorrect,
      isCritical: q.isCritical
    };
  }

  const score = correctCount;
  // Quy tắc 2 tầng: Đạt điểm tối thiểu VÀ không sai câu điểm liệt
  const passed = score >= profile.passingScore && !hasCriticalMistake;

  const startedTime = new Date(session.startedAt).getTime();
  const completedTime = new Date(completedAtIso).getTime();
  const actualDurationSeconds = Math.max(0, Math.floor((completedTime - startedTime) / 1000));

  const profileSnapshot: ProfileSnapshot = {
    questionCount: profile.questionCount,
    durationMinutes: profile.durationMinutes,
    passingScore: profile.passingScore,
    criticalQuestionCount: profile.criticalQuestionCount,
    criticalMistakeFails: profile.criticalMistakeFails,
    blueprint: profile.blueprint || []
  };

  return {
    id: session.examId,
    profileId: profile.id,
    title: session.title,
    questionBankVersionId: profile.questionBankVersionId,
    profileSnapshot,
    questionIds: session.questionIds,
    generatedAt: session.startedAt,
    startedAt: session.startedAt,
    completedAt: completedAtIso,
    allocatedDurationSeconds: session.allocatedDurationSeconds,
    actualDurationSeconds,
    score,
    totalQuestions: session.questionIds.length,
    correctCount,
    incorrectCount,
    unansweredCount,
    passed,
    hasCriticalMistake,
    criticalQuestionId,
    answers: answersRecord
  };
}

export async function saveExamRecord(record: ExamRecord): Promise<void> {
  await db.examHistory.put(record);
}

export async function saveActiveSession(session: ActiveExamSession): Promise<void> {
  await db.activeSession.put(session);
}

export async function getActiveSession(): Promise<ActiveExamSession | undefined> {
  const sessions = await db.activeSession.toArray();
  return sessions.length > 0 ? sessions[0] : undefined;
}

export async function clearActiveSession(examId: string): Promise<void> {
  await db.activeSession.delete(examId);
}
