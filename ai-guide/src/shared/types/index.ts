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
