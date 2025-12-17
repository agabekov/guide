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
    <div className={`${config.bgColor} rounded-xl border-2 ${config.borderColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-200 bg-white/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.labelBg}`}>
            <TypeIcon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          <div>
            <span className={`text-sm font-semibold ${config.labelText}`}>
              {config.label}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              · {suggestion.checklistItem}
            </span>
          </div>
        </div>
        <div className="text-sm text-gray-500 font-medium">
          {currentIndex + 1} из {totalCount}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Problem */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-gray-900">Проблема:</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pl-6">
            {suggestion.problem}
          </p>
        </div>

        {/* Why it matters */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-gray-900">Почему это важно:</span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed pl-6">
            {suggestion.why}
          </p>
        </div>

        {/* Before/After comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
              <XCircle className="w-3 h-3" />
              Сейчас:
            </div>
            <div className="bg-red-100 rounded-lg p-3 border border-red-200">
              <p className="text-sm text-red-900 font-medium">
                «{suggestion.originalText}»
              </p>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Предлагаю:
            </div>
            <div className="bg-green-100 rounded-lg p-3 border border-green-200">
              <p className="text-sm text-green-900 font-medium">
                «{suggestion.suggestedText}»
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5 py-4 bg-white/70 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={onPrevious}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Предыдущее"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === totalCount - 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Следующее"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Accept/Reject buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onReject(suggestion.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              <X className="w-4 h-4" />
              Отклонить
            </button>
            <button
              onClick={() => onAccept(suggestion.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors font-medium text-sm shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
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
