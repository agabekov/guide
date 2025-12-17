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
    <div className="space-y-8 animate-fade-in">
      {/* Success Header */}
      <div className="bg-gradient-to-br from-green-50/90 to-emerald-50/90 backdrop-blur-xl rounded-3xl border-2 border-green-300/50 p-8 animate-scale-in" style={{
        boxShadow: '0 20px 60px rgba(16, 185, 129, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="flex items-start gap-5">
          <div className="p-4 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-green-900 mb-3">
              Редактирование завершено!
            </h3>
            <p className="text-green-700 leading-relaxed text-lg">
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
      <div className="bg-white/98 backdrop-blur-xl rounded-3xl border border-white/30 overflow-hidden" style={{
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
      }}>
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white/50 backdrop-blur-sm flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <h4 className="font-bold text-gray-900 text-lg">Итоговый текст</h4>
        </div>
        <div className="p-6">
          <div className="bg-gradient-to-br from-gray-50/80 to-white rounded-2xl p-6 border border-gray-200 min-h-[200px]">
            <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-base">
              {finalText}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm border-t border-gray-200 flex gap-4">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-2xl hover:shadow-xl transition-all font-semibold hover:transform hover:-translate-y-0.5"
            style={{
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3), 0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
            }}
          >
            <Copy className="w-5 h-5" />
            Копировать текст
          </button>
          <button
            onClick={onDownload}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all font-semibold"
          >
            <Download className="w-5 h-5" />
            Скачать .docx
          </button>
          <button
            onClick={onNewCheck}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white/80 backdrop-blur-sm border border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:shadow-md transition-all font-semibold"
          >
            <RefreshCw className="w-5 h-5" />
            Новая проверка
          </button>
        </div>
      </div>

      {/* Accepted Changes Summary */}
      {acceptedCount > 0 && (
        <div className="bg-white/98 backdrop-blur-xl rounded-3xl border border-white/30 overflow-hidden" style={{
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
        }}>
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50/80 to-white/50 backdrop-blur-sm">
            <h4 className="font-bold text-gray-900 text-lg">
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
