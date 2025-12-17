/**
 * SuggestionCard Component
 * Displays a detailed editor comment with accept/reject actions
 */

import React from 'react';
import {
  AlertCircle,
  Lightbulb,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  X,
  FileText,
} from 'lucide-react';
import type { EditorSuggestion, SuggestionType } from '../../shared/types';

interface SuggestionCardProps {
  suggestion: EditorSuggestion;
  currentIndex: number;
  totalCount: number;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
}

const getTypeConfig = (type: SuggestionType) => {
  const configs = {
    critical: {
      label: 'Критическая правка',
      icon: AlertCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-500',
      labelBg: 'bg-red-100',
      labelText: 'text-red-700',
    },
    style: {
      label: 'Стилистическая правка',
      icon: Lightbulb,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-500',
      labelBg: 'bg-yellow-100',
      labelText: 'text-yellow-700',
    },
    seo: {
      label: 'SEO-оптимизация',
      icon: FileText,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-500',
      labelBg: 'bg-blue-100',
      labelText: 'text-blue-700',
    },
  };
  return configs[type];
};

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  currentIndex,
  totalCount,
  onAccept,
  onReject,
  onPrevious,
  onNext,
  onAcceptAll,
  onRejectAll,
}) => {
  const config = getTypeConfig(suggestion.type);
  const TypeIcon = config.icon;

  return (
    <div className="bg-white/98 backdrop-blur-xl rounded-3xl border border-white/30 overflow-hidden animate-fade-in" style={{
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
    }}>
      {/* Header */}
      <div className={`px-6 py-4 border-b border-gray-200 ${config.bgColor} backdrop-blur-sm flex items-center justify-between`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${config.labelBg} shadow-md`}>
            <TypeIcon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <span className={`text-base font-bold ${config.labelText}`}>
              {config.label}
            </span>
            <span className="text-sm text-gray-600 ml-2 font-medium">
              · {suggestion.checklistItem}
            </span>
          </div>
        </div>
        <div className="text-base text-gray-700 font-bold bg-white/60 px-3 py-1 rounded-lg">
          {currentIndex + 1} из {totalCount}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto">
        {/* Before/After comparison - moved to top for quick glance */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Сейчас:
            </div>
            <div className="bg-red-100 rounded-lg p-3 border border-red-200 min-h-[60px]">
              <p className="text-sm text-red-900 font-medium leading-relaxed">
                «{suggestion.originalText}»
              </p>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Предлагаю:
            </div>
            <div className="bg-green-100 rounded-lg p-3 border border-green-200 min-h-[60px]">
              <p className="text-sm text-green-900 font-medium leading-relaxed">
                «{suggestion.suggestedText}»
              </p>
            </div>
          </div>
        </div>

        {/* Problem - detailed explanation */}
        <div className="bg-white/60 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mt-0.5">
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 mb-1.5">В чём проблема</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {suggestion.problem}
              </p>
            </div>
          </div>
        </div>

        {/* Why it matters - detailed explanation */}
        <div className="bg-white/60 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 mb-1.5">Почему это важно</div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {suggestion.why}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 py-5 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="p-3 rounded-xl hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
              title="Предыдущее"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === totalCount - 1}
              className="p-3 rounded-xl hover:bg-white/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-md"
              title="Следующее"
            >
              <ChevronRight className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          {/* Accept/Reject buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onReject(suggestion.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all font-semibold text-sm"
            >
              <X className="w-5 h-5" />
              Отклонить
            </button>
            <button
              onClick={() => onAccept(suggestion.id)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-green-600 to-green-500 text-white hover:shadow-lg transition-all font-semibold text-sm hover:transform hover:-translate-y-0.5"
              style={{
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
              }}
            >
              <CheckCircle className="w-5 h-5" />
              Принять
            </button>
          </div>
        </div>

        {/* Bulk actions */}
        {totalCount > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center gap-4">
            <button
              onClick={onRejectAll}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <X className="w-4 h-4" />
              Отклонить все
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={onAcceptAll}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Принять все
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuggestionCard;
