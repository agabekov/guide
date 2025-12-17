/**
 * ReviewComplete Component
 * Displays the final result after all suggestions have been reviewed
 */

import React from 'react';
import { CheckCircle, Copy, Download, RefreshCw, FileText } from 'lucide-react';
import type { EditorSuggestion } from '../../shared/types';

interface ReviewCompleteProps {
  originalText: string;
  suggestions: EditorSuggestion[];
  overallComment: string;
  onCopy: () => void;
  onDownload: () => void;
  onNewCheck: () => void;
}

export const ReviewComplete: React.FC<ReviewCompleteProps> = ({
  originalText,
  suggestions,
  overallComment,
  onCopy,
  onDownload,
  onNewCheck,
}) => {
  // Calculate final text by applying accepted suggestions
  const getFinalText = () => {
    let result = originalText;
    const acceptedSuggestions = [...suggestions]
      .filter(s => s.status === 'accepted')
      .sort((a, b) => b.startIndex - a.startIndex); // Reverse order for safe replacement

    acceptedSuggestions.forEach(suggestion => {
      result =
        result.slice(0, suggestion.startIndex) +
        suggestion.suggestedText +
        result.slice(suggestion.endIndex);
    });

    return result;
  };

  const finalText = getFinalText();
  const acceptedCount = suggestions.filter(s => s.status === 'accepted').length;
  const rejectedCount = suggestions.filter(s => s.status === 'rejected').length;
  const totalCount = suggestions.length;

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-100 rounded-full">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-green-900 mb-2">
              Редактирование завершено!
            </h3>
            <p className="text-green-700 leading-relaxed">
              {overallComment}
            </p>

            {/* Stats */}
            <div className="mt-4 flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">{acceptedCount}</span> принято
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">{rejectedCount}</span> отклонено
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">
                  <span className="font-semibold">{totalCount}</span> всего замечаний
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final Text */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Итоговый текст</h4>
        </div>
        <div className="p-5">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-5 border border-gray-200 min-h-[200px]">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
              {finalText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <Copy className="w-5 h-5" />
            Копировать текст
          </button>
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <Download className="w-5 h-5" />
            Скачать .docx
          </button>
          <button
            onClick={onNewCheck}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <RefreshCw className="w-5 h-5" />
            Новая проверка
          </button>
        </div>
      </div>

      {/* Accepted Changes Summary */}
      {acceptedCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50">
            <h4 className="font-semibold text-gray-900">
              Принятые изменения ({acceptedCount})
            </h4>
          </div>
          <div className="divide-y divide-gray-100">
            {suggestions
              .filter(s => s.status === 'accepted')
              .map((suggestion, idx) => (
                <div key={suggestion.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500">
                          {suggestion.checklistItem}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-600 line-through">
                          {suggestion.originalText}
                        </span>
                        <span className="text-gray-400">→</span>
                        <span className="text-green-600 font-medium">
                          {suggestion.suggestedText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewComplete;
