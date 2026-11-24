import type {
  Question,
  ExamProfile,
  ExamRecord,
  UserProgressItem
} from '../types/quiz';
import type {
  CramSession,
  CramStage,
  CramBudget,
  CramBaseline,
  CramReadinessResult,
  CramReadinessLevel,
  ExamAnalysisResult,
  CategoryMistakeSummary
} from '../types/cram';
import { db } from '../db/dexie';
import { getQuestionsNeedingReview, calculateReadinessMetrics } from './learningEngine';
import { createSeededRandom, shuffleArray } from './examEngine';

export const DEFAULT_CRAM_BUDGET: CramBudget = {
  criticalTriage: 900,  // 15 phút
  criticalRepair: 1200, // 20 phút
  analysis: 600,        // 10 phút
  weaknessSprint: 1500, // 25 phút
  finalCheck: 600,      // 10 phút
  exam1: 1200,          // 20 phút (Invariant)
  exam2: 1200,          // 20 phút (Invariant)
  total: 7200           // 120 phút (Invariant)
};

export function startCramSession(
  profile: ExamProfile,
  questions: Question[],
  progressMap?: Map<string, UserProgressItem>,
  examHistory?: ExamRecord[],
  seed?: number
): CramSession {
  const now = new Date();
  const startedAt = now.toISOString();
  const deadlineAt = new Date(now.getTime() + 7200 * 1000).toISOString();

  const sessionSeed = seed ?? Math.floor(Math.random() * 1000000);
  const exam1Seed = sessionSeed + 1;
  const exam2Seed = sessionSeed + 2;

  const criticalQuestions = questions.filter(q => q.isCritical);
  const pMap = progressMap || new Map<string, UserProgressItem>();
  const eHist = examHistory || [];

  const criticalMastered = criticalQuestions.filter(
    q => pMap.get(q.id)?.status === 'mastered'
  ).length;

  const masteredCount = questions.filter(
    q => pMap.get(q.id)?.status === 'mastered'
  ).length;

  const reviewCount = getQuestionsNeedingReview(questions, pMap, true).length;
  const globalReadiness = calculateReadinessMetrics(questions, pMap, eHist);

  let readinessLevel: CramReadinessLevel = 'not-ready';
  if (globalReadiness.rating === 'MỨC ĐỘ SẴN SÀNG: CAO') readinessLevel = 'high';
  else if (globalReadiness.rating === 'GẦN SẴN SÀNG') readinessLevel = 'good';
  else if (globalReadiness.rating === 'ĐANG CỦNG CỐ') readinessLevel = 'borderline';

  const baseline: CramBaseline = {
    criticalMastered,
    masteredCount,
    reviewCount,
    readinessLevel,
    readinessScore: globalReadiness.score
  };

  return {
    id: `cram_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    mode: 'cram-120',
    profileId: profile.id,
    status: 'active',
    currentStage: 'critical-triage',
    stageCursor: 0,
    startedAt,
    deadlineAt,
    baseline,
    isPaused: false,
    totalPausedSeconds: 0,
    sessionSeed,
    exam1Seed,
    exam2Seed,
    budget: { ...DEFAULT_CRAM_BUDGET },
    stageStartedAt: startedAt,
    triageAnsweredIds: [],
    triageMistakeIds: [],
    criticalRepairRemainingIds: criticalQuestions.map(q => q.id),
    exam1MistakeIds: [],
    exam2MistakeIds: [],
    weakQuestionIds: [],
    finalCheckRemainingIds: []
  };
}

export function pauseCramSession(session: CramSession): CramSession {
  if (session.isPaused || session.status !== 'active') return session;
  const nowIso = new Date().toISOString();
  return {
    ...session,
    isPaused: true,
    pausedAt: nowIso,
    activeCramExam: session.activeCramExam
      ? { ...session.activeCramExam, pausedAt: nowIso }
      : undefined
  };
}

export function resumeCramSession(session: CramSession): CramSession {
  if (!session.isPaused || !session.pausedAt || session.status !== 'active') return session;

  const nowTime = Date.now();
  const pausedDurationSeconds = Math.max(0, Math.floor((nowTime - new Date(session.pausedAt).getTime()) / 1000));
  const newDeadlineAt = new Date(new Date(session.deadlineAt).getTime() + pausedDurationSeconds * 1000).toISOString();

  let updatedExam = session.activeCramExam;
  if (updatedExam) {
    const examPauseSec = updatedExam.pausedAt
      ? Math.max(0, Math.floor((nowTime - new Date(updatedExam.pausedAt).getTime()) / 1000))
      : pausedDurationSeconds;
    updatedExam = {
      ...updatedExam,
      pausedAt: undefined,
      totalPausedSeconds: updatedExam.totalPausedSeconds + examPauseSec
    };
  }

  return {
    ...session,
    isPaused: false,
    pausedAt: undefined,
    totalPausedSeconds: session.totalPausedSeconds + pausedDurationSeconds,
    deadlineAt: newDeadlineAt,
    activeCramExam: updatedExam
  };
}

export async function saveCramSession(session: CramSession): Promise<void> {
  try {
    await db.cramSessions.put(session);
  } catch (err) {
    console.error('Failed to save cram session to Dexie:', err);
  }
}

export async function loadActiveCramSession(): Promise<CramSession | null> {
  try {
    const activeSessions = await db.cramSessions
      .where('status')
      .equals('active')
      .toArray();

    if (activeSessions.length === 0) return null;

    const session = activeSessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];

    if (!session.isPaused && Date.now() > new Date(session.deadlineAt).getTime()) {
      session.status = 'expired';
      session.completedAt = new Date().toISOString();
      await db.cramSessions.put(session);
    }

    return session;
  } catch (err) {
    console.error('Failed to load active cram session:', err);
    return null;
  }
}

export async function abandonCramSession(session: CramSession): Promise<void> {
  const updated: CramSession = {
    ...session,
    status: 'abandoned',
    completedAt: new Date().toISOString()
  };
  await saveCramSession(updated);
}

export function getStageBudgetSeconds(budget: CramBudget, stage: CramStage): number {
  switch (stage) {
    case 'critical-triage':
      return budget.criticalTriage;
    case 'critical-repair':
      return budget.criticalRepair;
    case 'exam-1':
      return budget.exam1;
    case 'analysis':
      return budget.analysis;
    case 'weakness-sprint':
      return budget.weaknessSprint;
    case 'exam-2':
      return budget.exam2;
    case 'final-check':
      return budget.finalCheck;
    default:
      return 600;
  }
}

export function advanceCramStage(
  session: CramSession,
  nextStage: CramStage,
  actualStageElapsedSeconds?: number
): CramSession {
  const now = new Date().toISOString();
  const newBudget = { ...session.budget };

  if (actualStageElapsedSeconds !== undefined) {
    const plannedSeconds = getStageBudgetSeconds(session.budget, session.currentStage);
    const savedSeconds = plannedSeconds - actualStageElapsedSeconds;

    if (savedSeconds > 0 && (session.currentStage === 'critical-triage' || session.currentStage === 'critical-repair')) {
      newBudget.weaknessSprint = Math.min(2400, newBudget.weaknessSprint + savedSeconds);
    }
  }

  newBudget.exam1 = 1200;
  newBudget.exam2 = 1200;
  newBudget.total = 7200;

  return {
    ...session,
    currentStage: nextStage,
    stageCursor: 0,
    activeCramExam: undefined,
    stageStartedAt: now,
    budget: newBudget
  };
}

export function analyzeExamRecord(
  record: ExamRecord,
  questions: Question[]
): ExamAnalysisResult {
  const questionMap = new Map(questions.map(q => [q.id, q]));

  const categoryList: Question['category'][] = [
    'rules',
    'culture',
    'drivingTechnique',
    'structureRepair',
    'signs',
    'scenario'
  ];

  const byCategory: Record<Question['category'], CategoryMistakeSummary> = {
    rules: { total: 0, correct: 0, incorrect: 0, accuracy: 100 },
    culture: { total: 0, correct: 0, incorrect: 0, accuracy: 100 },
    drivingTechnique: { total: 0, correct: 0, incorrect: 0, accuracy: 100 },
    structureRepair: { total: 0, correct: 0, incorrect: 0, accuracy: 100 },
    signs: { total: 0, correct: 0, incorrect: 0, accuracy: 100 },
    scenario: { total: 0, correct: 0, incorrect: 0, accuracy: 100 }
  };

  const mistakeQuestionIds: string[] = [];

  for (const qId of record.questionIds) {
    const q = questionMap.get(qId);
    if (!q) continue;

    const ans = record.answers[qId];
    const cat = q.category;

    if (byCategory[cat]) {
      byCategory[cat].total += 1;
      if (ans && ans.isCorrect) {
        byCategory[cat].correct += 1;
      } else {
        byCategory[cat].incorrect += 1;
        mistakeQuestionIds.push(qId);
      }
    }
  }

  for (const cat of categoryList) {
    const item = byCategory[cat];
    item.accuracy = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 100;
  }

  return {
    score: record.score,
    correctCount: record.correctCount,
    incorrectCount: record.incorrectCount,
    unansweredCount: record.unansweredCount,
    criticalMistake: record.hasCriticalMistake,
    byCategory,
    mistakeQuestionIds
  };
}

/**
 * Tuyển chọn danh sách 20 câu hỏi cho Weakness Sprint dựa trên đúng các nhóm yếu từ FailureAnalysisStage.
 */
export function selectWeaknessSprintIds(
  questions: Question[],
  progressMap: Map<string, UserProgressItem>,
  exam1MistakeIds: string[],
  weakCategories: Question['category'][],
  seed: number
): string[] {
  const rng = createSeededRandom(seed + 500);
  const selected = new Set<string>(exam1MistakeIds);
  const weakSet = new Set<Question['category']>(
    weakCategories.length > 0 ? weakCategories : ['signs', 'scenario']
  );

  // 1. Ưu tiên các câu đang ở trạng thái 'review' thuộc nhóm yếu
  for (const q of questions) {
    if (selected.size >= 25) break;
    if (weakSet.has(q.category) && progressMap.get(q.id)?.status === 'review') {
      selected.add(q.id);
    }
  }

  // 2. Bổ sung câu 'review' ở các nhóm còn lại nếu chưa đủ 20 câu
  if (selected.size < 20) {
    for (const q of questions) {
      if (selected.size >= 20) break;
      if (progressMap.get(q.id)?.status === 'review') {
        selected.add(q.id);
      }
    }
  }

  // 3. Điền đủ tối thiểu 20 câu bằng câu chưa thành thạo trong các nhóm yếu (xáo trộn bằng seeded RNG)
  if (selected.size < 20) {
    const pool = shuffleArray(
      questions.filter(
        q => weakSet.has(q.category) && !selected.has(q.id) && progressMap.get(q.id)?.status !== 'mastered'
      ),
      rng
    );
    for (const q of pool) {
      selected.add(q.id);
      if (selected.size >= 20) break;
    }
  }

  return Array.from(selected);
}

/**
 * Xây dựng danh sách câu hỏi thực thi cho 4 stage luyện tập của Cram 120 (Single Source of Truth).
 */
export function getCramDrillQuestions(
  stage: 'critical-triage' | 'critical-repair' | 'weakness-sprint' | 'final-check',
  session: CramSession,
  questions: Question[],
  progressMap: Map<string, UserProgressItem>
): Question[] {
  const questionMap = new Map(questions.map(q => [q.id, q]));

  switch (stage) {
    case 'critical-triage':
      return questions.filter(q => q.isCritical);

    case 'critical-repair': {
      const ids = session.triageMistakeIds.length > 0
        ? session.triageMistakeIds
        : questions
            .filter(q => q.isCritical && progressMap.get(q.id)?.status === 'review')
            .map(q => q.id);
      return ids.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
    }

    case 'weakness-sprint': {
      const ids = session.weakQuestionIds.length > 0
        ? session.weakQuestionIds
        : selectWeaknessSprintIds(questions, progressMap, session.exam1MistakeIds, [], session.sessionSeed);
      return ids.map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
    }

    case 'final-check': {
      const ids = new Set<string>([
        ...session.exam2MistakeIds,
        ...session.exam1MistakeIds,
        ...session.criticalRepairRemainingIds
      ]);
      if (ids.size === 0) {
        const rng = createSeededRandom(session.sessionSeed + 900);
        return shuffleArray(questions.filter(q => q.isCritical), rng).slice(0, 10);
      }
      return Array.from(ids).map(id => questionMap.get(id)).filter((q): q is Question => q !== undefined);
    }
  }
}

export function calculateCramReadiness(
  session: CramSession,
  exam1Record?: ExamRecord,
  exam2Record?: ExamRecord
): CramReadinessResult {
  const exam1Score = exam1Record?.score;
  const exam2Score = exam2Record?.score;
  const exam2Passed = exam2Record?.passed ?? false;
  const criticalFinalErrors = session.finalCheckRemainingIds.length;
  const criticalRepairRemaining = session.criticalRepairRemainingIds.length;

  let level: CramReadinessResult['level'] = 'not-ready';
  let summaryText = '';
  let nextActionRecommendation = '';

  if ((exam2Score ?? 0) >= 28 && exam2Passed && criticalFinalErrors === 0 && criticalRepairRemaining === 0) {
    level = 'high';
    summaryText = 'Bạn đã triệt tiêu hoàn toàn rủi ro câu điểm liệt và đạt kết quả xuất sắc ở bài thi kiểm chứng.';
    nextActionRecommendation = 'Bạn đang ở trạng thái sẵn sàng cao. Thi thêm 1 đề ngẫu nhiên để duy trì cảm giác làm bài thi.';
  } else if ((exam2Score ?? 0) >= 27 && exam2Passed && criticalFinalErrors === 0) {
    level = 'good';
    summaryText = 'Bạn đạt điểm đỗ ở bài thi kiểm chứng và không có lỗi câu điểm liệt ở khâu kiểm tra an toàn cuối cùng.';
    nextActionRecommendation = 'Bạn đã đạt mức khá ổn. Khuyến nghị ôn lại các câu còn phân vân trước giờ thi.';
  } else if ((exam2Score ?? 0) >= 27) {
    level = 'borderline';
    summaryText = 'Bạn đạt điểm số chuẩn (≥ 27/30) nhưng vẫn còn tiềm ẩn rủi ro ở câu điểm liệt.';
    nextActionRecommendation = 'Đạt điểm số nhưng chưa an toàn tuyệt đối. Cần ôn ngay lại toàn bộ các câu điểm liệt vừa sai.';
  } else {
    level = 'not-ready';
    summaryText = 'Chưa đạt yêu cầu tối thiểu (điểm thi < 27 hoặc còn sai câu điểm liệt nghiêm trọng).';
    nextActionRecommendation = 'Chưa nên vội thi thật. Hãy tập trung luyện riêng mục "Câu sai" và 60 câu điểm liệt.';
  }

  return {
    level,
    exam1Score,
    exam2Score,
    criticalFinalErrors,
    criticalRepairRemaining,
    summaryText,
    nextActionRecommendation
  };
}
