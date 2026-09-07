import type {
  Question,
  UserProgressItem,
  QuestionStatus,
  ExamRecord,
  NextBestAction,
  ReadinessMetrics
} from '../types/quiz';
import { db } from '../db/dexie';

export interface ReviewWeights {
  critical: number;
  inReview: number;
  veryLowAccuracy: number;
  lowAccuracy: number;
  repeatedMistakes: number;
  criticalUnseen: number;
  unseen: number;
}

export const DEFAULT_REVIEW_WEIGHTS: ReviewWeights = {
  critical: 100,
  inReview: 70,
  veryLowAccuracy: 50,
  lowAccuracy: 30,
  repeatedMistakes: 30,
  criticalUnseen: 90,
  unseen: 20
};

export function createDefaultProgress(questionId: string): UserProgressItem {
  return {
    questionId,
    attempts: 0,
    correctCount: 0,
    incorrectCount: 0,
    consecutiveCorrect: 0,
    consecutiveIncorrect: 0,
    status: 'unseen',
    isBookmarked: false
  };
}

export function updateProgressOnAnswer(
  prev: UserProgressItem,
  isCorrect: boolean,
  nowIso: string = new Date().toISOString()
): UserProgressItem {
  const attempts = prev.attempts + 1;
  const correctCount = prev.correctCount + (isCorrect ? 1 : 0);
  const incorrectCount = prev.incorrectCount + (isCorrect ? 0 : 1);
  const firstAttemptAt = prev.firstAttemptAt || nowIso;

  if (isCorrect) {
    const consecutiveCorrect = prev.consecutiveCorrect + 1;
    const consecutiveIncorrect = 0;
    const status: QuestionStatus = consecutiveCorrect >= 2 ? 'mastered' : 'learning';

    return {
      ...prev,
      attempts,
      correctCount,
      incorrectCount,
      consecutiveCorrect,
      consecutiveIncorrect,
      status,
      firstAttemptAt,
      lastAttemptAt: nowIso,
      lastCorrectAt: nowIso
    };
  } else {
    // Làm sai: reset chuỗi đúng và chuyển ngay về trạng thái 'review'
    return {
      ...prev,
      attempts,
      correctCount,
      incorrectCount,
      consecutiveCorrect: 0,
      consecutiveIncorrect: prev.consecutiveIncorrect + 1,
      status: 'review',
      firstAttemptAt,
      lastAttemptAt: nowIso
    };
  }
}

export async function recordQuestionAnswer(
  questionId: string,
  isCorrect: boolean
): Promise<UserProgressItem> {
  const existing = await db.progress.get(questionId);
  const base = existing || createDefaultProgress(questionId);
  const updated = updateProgressOnAnswer(base, isCorrect);
  await db.progress.put(updated);
  return updated;
}

export async function toggleBookmark(questionId: string): Promise<boolean> {
  const existing = await db.progress.get(questionId);
  const base = existing || createDefaultProgress(questionId);
  const newBookmarked = !base.isBookmarked;
  await db.progress.put({ ...base, isBookmarked: newBookmarked });
  return newBookmarked;
}

/**
 * Lấy danh sách động các câu cần ôn (Dynamic Review View):
 * - Câu điểm liệt chưa đạt mastered (tránh rủi ro trượt)
 * - Câu đang ở trạng thái 'review'
 * - Câu có số lần làm sai liên tiếp > 0
 */
export function getQuestionsNeedingReview(
  questions: Question[],
  progressMap: Map<string, UserProgressItem>
): Question[] {
  return questions.filter(q => {
    const p = progressMap.get(q.id);
    return (
      (q.isCritical && p?.status !== 'mastered') ||
      p?.status === 'review' ||
      (p?.consecutiveIncorrect || 0) > 0
    );
  });
}

export function calculateReviewPriorityScore(
  question: Question,
  progress?: UserProgressItem,
  nowIso: string = new Date().toISOString(),
  weights: ReviewWeights = DEFAULT_REVIEW_WEIGHTS
): number {
  if (!progress || progress.status === 'unseen' || progress.attempts === 0) {
    return question.isCritical ? weights.criticalUnseen : weights.unseen;
  }

  let score = 0;
  if (question.isCritical) score += weights.critical;
  if (progress.status === 'review') score += weights.inReview;

  const acc = progress.attempts > 0 ? progress.correctCount / progress.attempts : 0;
  if (acc < 0.5) score += weights.veryLowAccuracy;
  else if (acc < 0.7) score += weights.lowAccuracy;

  if (progress.consecutiveIncorrect >= 2) score += weights.repeatedMistakes;

  // Điểm cộng theo thời gian chưa ôn lại (quá 3 ngày +10 điểm, quá 7 ngày +20 điểm)
  if (progress.lastAttemptAt) {
    const daysSince = (new Date(nowIso).getTime() - new Date(progress.lastAttemptAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) score += 20;
    else if (daysSince > 3) score += 10;
  }

  return score;
}

export function calculateReadinessMetrics(
  allQuestions: Question[],
  progressMap: Map<string, UserProgressItem>,
  examHistory: ExamRecord[]
): ReadinessMetrics {
  const criticalQuestions = allQuestions.filter(q => q.isCritical);
  const criticalMasteredCount = criticalQuestions.filter(
    q => progressMap.get(q.id)?.status === 'mastered'
  ).length;
  const criticalMasteryRate = criticalQuestions.length > 0
    ? criticalMasteredCount / criticalQuestions.length
    : 0;

  const totalMasteredCount = allQuestions.filter(
    q => progressMap.get(q.id)?.status === 'mastered'
  ).length;
  const bankMasteryRate = allQuestions.length > 0
    ? totalMasteredCount / allQuestions.length
    : 0;

  // Lấy tối đa 5 bài thi gần nhất
  const last5Exams = [...examHistory]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);

  const examPassCount = last5Exams.filter(e => e.passed).length;
  const examPassRateLast5 = last5Exams.length > 0 ? examPassCount / last5Exams.length : 0;

  const recentCriticalMistakes = last5Exams.filter(e => e.hasCriticalMistake).length;

  // Trọng số: 40% Điểm liệt an toàn + 40% Kết quả thi thử + 20% Tỷ lệ thành thạo ngân hàng câu hỏi
  let score = Math.round(
    criticalMasteryRate * 40 +
    examPassRateLast5 * 40 +
    bankMasteryRate * 20
  );

  // Phạt nặng nếu trong 5 đề gần nhất có đề sai câu điểm liệt
  if (recentCriticalMistakes > 0) {
    score = Math.min(score, 75);
  }

  let rating: ReadinessMetrics['rating'] = 'CẦN HỌC NỀN TẢNG';
  if (score >= 90 && recentCriticalMistakes === 0 && criticalMasteryRate >= 0.95) {
    rating = 'MỨC ĐỘ SẴN SÀNG: CAO';
  } else if (score >= 80 && recentCriticalMistakes === 0) {
    rating = 'GẦN SẴN SÀNG';
  } else if (score >= 60) {
    rating = 'ĐANG CỦNG CỐ';
  }

  return {
    score,
    rating,
    criticalMasteryRate,
    examPassRateLast5,
    bankMasteryRate,
    recentCriticalMistakes
  };
}

export function resolveNextBestAction(
  allQuestions: Question[],
  progressMap: Map<string, UserProgressItem>,
  examHistory: ExamRecord[],
  fixedExamsCompletedCount: number = 0
): NextBestAction {
  const criticals = allQuestions.filter(q => q.isCritical);
  const criticalUnmastered = criticals.filter(
    q => progressMap.get(q.id)?.status !== 'mastered'
  );

  // 1. Nếu còn câu điểm liệt chưa thành thạo -> Ưu tiên tuyệt đối số 1
  if (criticalUnmastered.length > 0) {
    return {
      stage: 'critical-foundation',
      stageTitle: 'Bước 1: 60 Câu Điểm Liệt',
      actionText: `Ôn ${criticalUnmastered.length} câu điểm liệt chưa thành thạo`,
      badge: `Ưu tiên cao nhất (${60 - criticalUnmastered.length}/60)`,
      targetMode: 'practice',
      filterParam: 'critical'
    };
  }

  // 2. Nếu ngân hàng câu hỏi chưa học được 80%
  const attemptedCount = allQuestions.filter(
    q => (progressMap.get(q.id)?.attempts || 0) > 0
  ).length;
  if (attemptedCount < 480) { // < 80% của 600 câu
    return {
      stage: 'bank-foundation',
      stageTitle: 'Bước 2: Nắm Vững 600 Câu',
      actionText: `Học các câu mới (${attemptedCount}/600 đã làm)`,
      badge: 'Nền tảng',
      targetMode: 'practice',
      filterParam: 'unseen'
    };
  }

  // 3. Có câu đang ở trạng thái review cần ôn tập
  const reviewCount = allQuestions.filter(
    q => progressMap.get(q.id)?.status === 'review'
  ).length;
  if (reviewCount >= 10) {
    return {
      stage: 'topic-reinforcement',
      stageTitle: 'Bước 3: Luyện Theo Chủ Đề & Khắc Phục Lỗi',
      actionText: `Ôn tập ${reviewCount} câu trả lời sai cần củng cố`,
      badge: 'Khắc phục lỗ hổng',
      targetMode: 'review'
    };
  }

  // 4. Nếu chưa hoàn thành đủ 18 đề luyện chuẩn cố định
  if (fixedExamsCompletedCount < 18) {
    return {
      stage: 'fixed-exams',
      stageTitle: 'Bước 4: 18 Đề Luyện Chuẩn (Mốc Ôn Tập)',
      actionText: `Làm Đề luyện số ${fixedExamsCompletedCount + 1}/18`,
      badge: 'Luyện đề chuẩn',
      targetMode: 'fixed-exams'
    };
  }

  // 5. Kiểm tra chuỗi thi ngẫu nhiên (yêu cầu streak 5 đề liên tiếp đạt)
  const last5 = [...examHistory]
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, 5);
  const passStreak = last5.findIndex(e => !e.passed);
  const currentStreak = passStreak === -1 ? last5.length : passStreak;

  if (currentStreak < 5) {
    return {
      stage: 'random-exams',
      stageTitle: 'Bước 5: Thi Ngẫu Nhiên',
      actionText: `Thi đề ngẫu nhiên (Đạt chuỗi ${currentStreak}/5 đề)`,
      badge: 'Thử thách phòng thi',
      targetMode: 'exam'
    };
  }

  // 6. Sẵn sàng cao -> Speed Mode
  return {
    stage: 'speed-training',
    stageTitle: 'Bước 6: Luyện Tốc Độ & Giữ Vững Phong Độ',
    actionText: 'Luyện thi phản xạ tốc độ cao',
    badge: 'Mức độ sẵn sàng: CAO',
    targetMode: 'exam'
  };
}
