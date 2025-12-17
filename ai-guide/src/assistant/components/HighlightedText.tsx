/**
 * HighlightedText Component
 * Displays text with inline highlighted suggestions from the editor
 */

import React from 'react';
import type { EditorSuggestion, SuggestionType } from '../../shared/types';

interface HighlightedTextProps {
  text: string;
  suggestions: EditorSuggestion[];
  activeSuggestionId: string | null;
  onSuggestionClick: (id: string) => void;
}

const getHighlightColors = (type: SuggestionType, isActive: boolean) => {
  const colors = {
    critical: {
      bg: isActive ? 'bg-red-200' : 'bg-red-100',
      border: 'border-b-2 border-red-400',
      hover: 'hover:bg-red-200',
    },
    style: {
      bg: isActive ? 'bg-yellow-200' : 'bg-yellow-100',
      border: 'border-b-2 border-yellow-400',
      hover: 'hover:bg-yellow-200',
    },
    seo: {
      bg: isActive ? 'bg-blue-200' : 'bg-blue-100',
      border: 'border-b-2 border-blue-400',
      hover: 'hover:bg-blue-200',
    },
  };
  return colors[type];
};

const getStatusStyles = (status: EditorSuggestion['status']) => {
  switch (status) {
    case 'accepted':
      return 'line-through opacity-50';
    case 'rejected':
      return 'opacity-70';
    default:
      return '';
  }
};

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  suggestions,
  activeSuggestionId,
  onSuggestionClick,
}) => {
  // Sort suggestions by startIndex to process them in order
  const sortedSuggestions = [...suggestions]
    .filter(s => s.status === 'pending')
    .sort((a, b) => a.startIndex - b.startIndex);

  // Build text segments with highlights
  const segments: React.ReactNode[] = [];
  let lastIndex = 0;

  sortedSuggestions.forEach((suggestion, idx) => {
    // Add text before this suggestion
    if (suggestion.startIndex > lastIndex) {
      segments.push(
        <span key={`text-${idx}`}>
          {text.slice(lastIndex, suggestion.startIndex)}
        </span>
      );
    }

    // Add highlighted suggestion
    const isActive = activeSuggestionId === suggestion.id;
    const colors = getHighlightColors(suggestion.type, isActive);
    const statusStyles = getStatusStyles(suggestion.status);

    segments.push(
      <span
        key={`highlight-${suggestion.id}`}
        className={`
          ${colors.bg} ${colors.border} ${colors.hover} ${statusStyles}
          cursor-pointer rounded-sm px-0.5 transition-all duration-200
          ${isActive ? 'ring-2 ring-offset-1 ring-gray-400' : ''}
        `}
        onClick={() => onSuggestionClick(suggestion.id)}
        title="Click to see editor comment"
      >
        {suggestion.originalText}
        <sup className="ml-0.5 text-xs font-bold opacity-70">
          {suggestions.findIndex(s => s.id === suggestion.id) + 1}
        </sup>
      </span>
    );

    lastIndex = suggestion.endIndex;
  });

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push(
      <span key="text-end">{text.slice(lastIndex)}</span>
    );
  }

  // If no pending suggestions, show plain text with accepted changes applied
  if (sortedSuggestions.length === 0) {
    let resultText = text;
    const acceptedSuggestions = [...suggestions]
      .filter(s => s.status === 'accepted')
      .sort((a, b) => b.startIndex - a.startIndex); // Reverse order for safe replacement

    acceptedSuggestions.forEach(suggestion => {
      resultText =
        resultText.slice(0, suggestion.startIndex) +
        suggestion.suggestedText +
        resultText.slice(suggestion.endIndex);
    });

    return (
      <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
        {resultText}
      </div>
    );
  }

  return (
    <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
      {segments}
    </div>
  );
};

export default HighlightedText;
