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

/**
 * Khởi tạo phiên Cấp Tốc 120 phút với wall-clock deadline thực, seed tái lập được
 * và snapshot Baseline trước khi thực hiện attempt đầu tiên của phiên.
 */
export function startCramSession(
  profile: ExamProfile,
  questions: Question[],
  progressMap?: Map<string, UserProgressItem>,
  examHistory?: ExamRecord[],
  seed?: number
): CramSession {
  const now = new Date();
  const startedAt = now.toISOString();
  // 120 phút = 7200 giây
  const deadlineAt = new Date(now.getTime() + 7200 * 1000).toISOString();

  const sessionSeed = seed ?? Math.floor(Math.random() * 1000000);
  const exam1Seed = sessionSeed + 1;
  const exam2Seed = sessionSeed + 2;

  // Lấy danh sách 60 câu điểm liệt
  const criticalQuestions = questions.filter(q => q.isCritical);

  // Chụp ảnh snapshot Baseline tại thời điểm bắt đầu phiên
  const pMap = progressMap || new Map<string, UserProgressItem>();
  const eHist = examHistory || [];

  const criticalMastered = criticalQuestions.filter(
    q => pMap.get(q.id)?.status === 'mastered'
  ).length;

  const masteredCount = questions.filter(
    q => pMap.get(q.id)?.status === 'mastered'
  ).length;

  const reviewCount = getQuestionsNeedingReview(questions, pMap).length;

  const globalReadiness = calculateReadinessMetrics(questions, pMap, eHist);

  // Map rating sang CramReadinessLevel
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

/**
 * Tạm dừng phiên ôn tập (Freeze countdown)
 */
export function pauseCramSession(session: CramSession): CramSession {
  if (session.isPaused || session.status !== 'active') return session;
  return {
    ...session,
    isPaused: true,
    pausedAt: new Date().toISOString()
  };
}

/**
 * Tiếp tục phiên ôn tập sau khi tạm dừng (Cộng dời deadlineAt tương ứng thời gian tạm dừng)
 */
export function resumeCramSession(session: CramSession): CramSession {
  if (!session.isPaused || !session.pausedAt || session.status !== 'active') return session;

  const pausedTime = new Date(session.pausedAt).getTime();
  const nowTime = Date.now();
  const pausedDurationSeconds = Math.max(0, Math.floor((nowTime - pausedTime) / 1000));

  const currentDeadline = new Date(session.deadlineAt).getTime();
  const newDeadlineAt = new Date(currentDeadline + pausedDurationSeconds * 1000).toISOString();

  return {
    ...session,
    isPaused: false,
    pausedAt: undefined,
    totalPausedSeconds: session.totalPausedSeconds + pausedDurationSeconds,
    deadlineAt: newDeadlineAt
  };
}

/**
 * Lưu phiên vào Dexie (Source of truth)
 */
export async function saveCramSession(session: CramSession): Promise<void> {
  try {
    await db.cramSessions.put(session);
  } catch (err) {
    console.error('Failed to save cram session to Dexie:', err);
  }
}

/**
 * Tải phiên Cấp tốc đang chạy từ Dexie
 */
export async function loadActiveCramSession(): Promise<CramSession | null> {
  try {
    const activeSessions = await db.cramSessions
      .where('status')
      .equals('active')
      .toArray();

    if (activeSessions.length === 0) return null;

    // Lấy phiên gần nhất
    const session = activeSessions.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];

    // Kiểm tra xem đã quá deadline thực chưa (nếu không đang pause)
    if (!session.isPaused) {
      const isExpired = Date.now() > new Date(session.deadlineAt).getTime();
      if (isExpired) {
        session.status = 'expired';
        session.completedAt = new Date().toISOString();
        await db.cramSessions.put(session);
      }
    }

    return session;
  } catch (err) {
    console.error('Failed to load active cram session:', err);
    return null;
  }
}

/**
 * Hủy bỏ phiên ôn tập
 */
export async function abandonCramSession(session: CramSession): Promise<void> {
  const updated: CramSession = {
    ...session,
    status: 'abandoned',
    completedAt: new Date().toISOString()
  };
  await saveCramSession(updated);
}

/**
 * Lấy ngân sách thời gian mục tiêu (giây) của từng giai đoạn
 */
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

/**
 * Chuyển sang giai đoạn tiếp theo và tái tính toán adaptive budget cho 80 phút non-exam
 */
export function advanceCramStage(
  session: CramSession,
  nextStage: CramStage,
  actualStageElapsedSeconds?: number
): CramSession {
  const now = new Date().toISOString();

  // Tạo bản sao budget
  const newBudget = { ...session.budget };

  // Nếu stage trước hoàn thành sớm hơn dự kiến, chuyển phần dư sang Weakness Sprint hoặc Final Check
  if (actualStageElapsedSeconds !== undefined) {
    const plannedSeconds = getStageBudgetSeconds(session.budget, session.currentStage);
    const savedSeconds = plannedSeconds - actualStageElapsedSeconds;

    // Chỉ tái phân bổ cho các stage non-exam (tổng 4800s không vượt quá)
    if (savedSeconds > 0 && session.currentStage !== 'exam-1' && session.currentStage !== 'exam-2') {
      if (session.currentStage === 'critical-triage' || session.currentStage === 'critical-repair') {
        newBudget.weaknessSprint = Math.min(2400, newBudget.weaknessSprint + savedSeconds);
      }
    }
  }

  // Bảo đảm bất biến tuyệt đối:
  newBudget.exam1 = 1200;
  newBudget.exam2 = 1200;
  newBudget.total = 7200;

  return {
    ...session,
    currentStage: nextStage,
    stageStartedAt: now,
    budget: newBudget
  };
}

/**
 * Phân tích kết quả bài thi thử theo từng nhóm chủ đề
 */
export function analyzeExamRecord(
  record: ExamRecord,
  questions: Question[]
): ExamAnalysisResult {
  const questionMap = new Map(questions.map(q => [q.id, q]));

  const categoryCategories: Question['category'][] = [
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

  // Tính accuracy từng nhóm
  for (const cat of categoryCategories) {
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
 * Xây dựng danh sách câu hỏi ưu tiên theo từng giai đoạn của phiên cấp tốc
 */
export function buildCramQueue(
  stage: CramStage,
  session: CramSession,
  questions: Question[],
  progressMap: Map<string, UserProgressItem>,
  _examHistory: ExamRecord[]
): Question[] {
  const questionMap = new Map(questions.map(q => [q.id, q]));

  switch (stage) {
    case 'critical-triage': {
      // Toàn bộ 60 câu điểm liệt
      return questions.filter(q => q.isCritical);
    }

    case 'critical-repair': {
      // 1. Câu sai từ triage vừa xong
      // 2. Câu điểm liệt từng làm sai trong lịch sử học
      const mistakeIds = new Set<string>(session.triageMistakeIds);

      for (const q of questions) {
        if (q.isCritical) {
          const prog = progressMap.get(q.id);
          if (prog && (prog.status === 'review' || prog.incorrectCount > 0) && prog.status !== 'mastered') {
            mistakeIds.add(q.id);
          }
        }
      }

      // Nếu không có câu sai nào, vẫn đưa 10 câu điểm liệt tiêu biểu để rà soát
      if (mistakeIds.size === 0) {
        return questions.filter(q => q.isCritical).slice(0, 15);
      }

      return Array.from(mistakeIds)
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined);
    }

    case 'weakness-sprint': {
      // Ưu tiên câu sai từ Exam 1 + các câu thuộc nhóm có tỷ lệ sai cao nhất
      const targetIds = new Set<string>(session.exam1MistakeIds);

      // Bổ sung các câu trong weakQuestionIds nếu có
      for (const id of session.weakQuestionIds) {
        targetIds.add(id);
      }

      // Nếu số lượng câu < 20, lấy thêm các câu đang ở trạng thái 'review' từ ngân hàng câu
      if (targetIds.size < 20) {
        for (const [qId, prog] of progressMap.entries()) {
          if (prog.status === 'review') {
            targetIds.add(qId);
            if (targetIds.size >= 25) break;
          }
        }
      }

      // Fallback nếu người dùng học quá tốt: lấy các câu tình huống và biển báo quan trọng
      if (targetIds.size === 0) {
        const fallback = questions.filter(q => q.category === 'signs' || q.category === 'scenario').slice(0, 20);
        return fallback;
      }

      return Array.from(targetIds)
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined);
    }

    case 'final-check': {
      // Remediation-only:
      // 1. Critical questions chưa mastered
      // 2. Questions sai trong Exam 2
      // 3. Questions sai trong Exam 1
      const checkIds = new Set<string>();

      // Câu sai Exam 2
      for (const id of session.exam2MistakeIds) {
        checkIds.add(id);
      }

      // Câu sai Exam 1
      for (const id of session.exam1MistakeIds) {
        checkIds.add(id);
      }

      // Câu điểm liệt chưa an toàn
      for (const q of questions) {
        if (q.isCritical) {
          const prog = progressMap.get(q.id);
          if (prog && prog.status !== 'mastered') {
            checkIds.add(q.id);
          }
        }
      }

      // Nếu sạch lỗi: lấy 10 câu điểm liệt quan trọng nhất để xác nhận lần cuối
      if (checkIds.size === 0) {
        return questions.filter(q => q.isCritical).slice(0, 10);
      }

      return Array.from(checkIds)
        .map(id => questionMap.get(id))
        .filter((q): q is Question => q !== undefined);
    }

    default:
      return [];
  }
}

/**
 * Tính toán mức độ sẵn sàng (Readiness) sau khi kết thúc phiên Cấp Tốc 120 phút
 */
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

  // Rule 1: HIGH
  // exam2Score >= 28 && criticalFinalErrors === 0 && criticalRepairRemaining === 0
  if ((exam2Score ?? 0) >= 28 && exam2Passed && criticalFinalErrors === 0 && criticalRepairRemaining === 0) {
    level = 'high';
    summaryText = 'Bạn đã triệt tiêu hoàn toàn rủi ro câu điểm liệt và đạt kết quả xuất sắc ở cả 2 bài thi thử.';
    nextActionRecommendation = 'Bạn đang ở trạng thái sẵn sàng cao. Thi thêm 1 đề ngẫu nhiên để duy trì cảm giác làm bài thi.';
  }
  // Rule 2: GOOD
  // exam2Score >= 27 && exam2Passed && criticalFinalErrors === 0
  else if ((exam2Score ?? 0) >= 27 && exam2Passed && criticalFinalErrors === 0) {
    level = 'good';
    summaryText = 'Bạn đạt điểm đỗ ở bài thi kiểm chứng và không có lỗi câu điểm liệt ở khâu kiểm tra an toàn cuối cùng.';
    nextActionRecommendation = 'Bạn đã đạt mức khá ổn. Khuyến nghị ôn lại các câu còn phân vân trước giờ thi.';
  }
  // Rule 3: BORDERLINE
  // exam2Score >= 27 && (criticalFinalErrors > 0 || criticalRepairRemaining > 0)
  else if ((exam2Score ?? 0) >= 27) {
    level = 'borderline';
    summaryText = 'Bạn đạt điểm số chuẩn (≥27/30) nhưng vẫn còn tiềm ẩn rủi ro ở câu điểm liệt.';
    nextActionRecommendation = 'Đạt điểm số nhưng chưa an toàn tuyệt đối. Cần ôn ngay lại toàn bộ các câu điểm liệt vừa sai.';
  }
  // Rule 4: NOT READY
  else {
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
