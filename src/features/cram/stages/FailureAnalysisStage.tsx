import React, { useMemo } from 'react';
import type { Question, ExamRecord } from '../../../types/quiz';
import { analyzeExamRecord } from '../../../services/cramEngine';
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Layers
} from 'lucide-react';

interface FailureAnalysisStageProps {
  examRecord: ExamRecord;
  questions: Question[];
  onProceedToSprint: (weakCategories: string[]) => void;
}

export const FailureAnalysisStage: React.FC<FailureAnalysisStageProps> = ({
  examRecord,
  questions,
  onProceedToSprint
}) => {
  const analysis = useMemo(() => {
    return analyzeExamRecord(examRecord, questions);
  }, [examRecord, questions]);

  const categoryNames: Record<Question['category'], string> = {
    rules: 'Quy tắc giao thông & Khái niệm',
    culture: 'Văn hóa & Đạo đức lái xe',
    drivingTechnique: 'Kỹ thuật lái xe ô tô',
    structureRepair: 'Cấu tạo & Sửa chữa cơ bản',
    signs: 'Hệ thống biển báo đường bộ',
    scenario: 'Giải thế sa hình & Tình huống'
  };

  // Sắp xếp các nhóm có tỷ lệ sai từ cao xuống thấp
  const sortedCategories = useMemo(() => {
    return (Object.keys(analysis.byCategory) as Question['category'][])
      .map(cat => ({
        category: cat,
        name: categoryNames[cat],
        ...analysis.byCategory[cat]
      }))
      .filter(item => item.total > 0)
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [analysis]);

  const weakestCategory = sortedCategories[0];

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in py-2">
      {/* Overview Banner */}
      <div className={`p-5 rounded-2xl border text-white relative overflow-hidden ${
        examRecord.passed
          ? 'bg-gradient-to-br from-slate-900 to-emerald-950 border-emerald-800/60'
          : 'bg-gradient-to-br from-slate-900 to-rose-950 border-rose-800/60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/15">
              Phân tích đề thi #1
            </span>
            <h3 className="text-xl sm:text-2xl font-bold">
              Kết Quả: {examRecord.score}/30 — {examRecord.passed ? 'ĐẠT' : 'KHÔNG ĐẠT'}
            </h3>
            {examRecord.hasCriticalMistake && (
              <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold pt-1">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Rất nguy hiểm: Đã sai câu điểm liệt trong đề thi này!</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="text-3xl font-black font-mono">
              {Math.round((examRecord.correctCount / 30) * 100)}%
            </div>
            <div className="text-xs text-slate-300">Độ chính xác</div>
          </div>
        </div>
      </div>

      {/* Chẩn đoán nhóm yếu nhất */}
      {weakestCategory && weakestCategory.accuracy < 100 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20 text-amber-900 dark:text-amber-200">
          <TrendingDown className="w-5 h-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-xs space-y-1">
            <strong className="text-sm font-bold block">
              Phát hiện lỗ hổng chính: {weakestCategory.name}
            </strong>
            <p className="leading-relaxed text-slate-600 dark:text-slate-300">
              Nhóm này đang có độ chính xác thấp nhất ({weakestCategory.accuracy}% - sai {weakestCategory.incorrect}/{weakestCategory.total} câu). 
              Hệ thống sẽ tập trung cấp tốc câu hỏi của nhóm này vào Sprint tiếp theo.
            </p>
          </div>
        </div>
      )}

      {/* Bảng phân tích chi tiết 6 nhóm */}
      <div className="bg-white dark:bg-[#121826] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Độ Chính Xác Từng Nhóm Chủ Đề</span>
          </h4>
          <span className="text-xs text-slate-400 font-mono">30 câu đã thi</span>
        </div>

        <div className="space-y-3 pt-1">
          {sortedCategories.map(item => (
            <div key={item.category} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {item.name}
                </span>
                <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                  {item.correct}/{item.total} đúng ({item.accuracy}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    item.accuracy >= 90
                      ? 'bg-emerald-500'
                      : item.accuracy >= 70
                      ? 'bg-blue-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${item.accuracy}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action CTA */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={() => onProceedToSprint(sortedCategories.filter(c => c.accuracy < 100).map(c => c.category))}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-7 py-3 rounded-xl font-bold text-xs shadow-md shadow-blue-600/25 active:scale-95 transition"
        >
          <span>Bắt đầu Sprint Vá Điểm Yếu (25 phút)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
