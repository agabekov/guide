export interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  selected: boolean;
}

export interface GeneratedFAQ {
  question: string;
  answer: string;
}

export interface ModelConfig {
  name: string;
  provider: 'groq' | 'openrouter';
  displayName: string;
}

export interface CheckResult {
  correctedQuestion: string;
  correctedAnswer: string;
  changes: Change[];
  complianceScore: number;
  seoScore: number;
  originalText: string;
  appliedComments: string[];
  editorComment: string;
}

export interface Change {
  category: string;
  type: 'critical' | 'style' | 'seo';
  description: string;
  before: string;
  after: string;
  checklistItem: string;
}

// New Editor Review System Types

export type SuggestionType = 'critical' | 'style' | 'seo';
export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export interface EditorSuggestion {
  id: string;

  // Position in original text
  startIndex: number;
  endIndex: number;
  originalText: string;

  // Editor's suggestion
  suggestedText: string;

  // Explanation (the key part!)
  type: SuggestionType;
  problem: string;           // What's wrong
  why: string;               // Why it matters
  checklistItem: string;     // Reference to checklist item

  // State
  status: SuggestionStatus;
}

export interface EditorReview {
  originalText: string;
  suggestions: EditorSuggestion[];
  overallComment: string;    // General editor comment
  stats: {
    critical: number;
    style: number;
    seo: number;
  };
}
