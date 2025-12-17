/**
 * Icon Components
 *
 * Note: Most icons should be imported directly from lucide-react instead of using these custom components.
 * These are only kept for backwards compatibility or for custom icons not available in lucide-react.
 *
 * Recommended imports from lucide-react:
 * import { AlertCircle, CheckCircle, Download, Copy, RefreshCw, Upload,
 *          ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
 */

import React from 'react';

interface IconProps {
  className?: string;
}

// Custom icons (if needed - prefer lucide-react versions)
export const AlertCircle: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"/>
    <line x1="12" y1="8" x2="12" y2="12"/>
    <line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

export const CheckCircle: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
  </svg>
);

export const Download: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
  </svg>
);

export const Copy: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

export const RefreshCw: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
);

export const Upload: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
  </svg>
);

export const ChevronDown: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export const ChevronUp: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <polyline points="18 15 12 9 6 15"/>
  </svg>
);

export const Settings: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 1v6m0 6v6m8.66-13.66l-4.24 4.24m-4.24 4.24l-4.24 4.24M23 12h-6m-6 0H1m17.66 8.66l-4.24-4.24m-4.24-4.24l-4.24-4.24"/>
  </svg>
);

export const X: React.FC<IconProps> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
