/**
 * SecureDoc Pipeline - Constants and Configuration
 */

import { PipelinePhase, UserSettings } from './types';

export const DEFAULT_BACKEND_URL = 'http://localhost:8001';

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/v1/auth/login',
  REGISTER: '/api/v1/auth/register',
  REFRESH_TOKEN: '/api/v1/auth/refresh',
  PROFILE: '/api/v1/auth/me',

  // Documents & Pipeline
  DOCUMENTS: '/api/v1/documents',
  DOCUMENT_BY_ID: (id: string) => `/api/v1/documents/${id}`,
  DOCUMENT_STATUS: (id: string) => `/api/v1/documents/${id}/status`,
  DOCUMENT_AUDIT: (id: string) => `/api/v1/documents/${id}/audit`,
  UPLOAD: '/api/v1/documents/upload',

  // Approvals
  APPROVE: (id: string) => `/api/v1/documents/${id}/approve`,
  REJECT: (id: string) => `/api/v1/documents/${id}/reject`,
  VERIFY: (id: string) => `/api/v1/documents/${id}/verify`,

  // Dashboard Stats
  STATS: '/api/v1/dashboard/stats',
  HEALTH: '/api/v1/health',
};

export const DEFAULT_SETTINGS: UserSettings = {
  backendUrl: DEFAULT_BACKEND_URL,
  authToken: undefined,
  autoUpload: false,
  notifications: true,
  interceptDownloads: true,
  interceptDragDrop: true,
  interceptEmails: true,
};

export interface PhaseMetadata {
  id: PipelinePhase;
  order: number;
  label: string;
  shortLabel: string;
  description: string;
}

export const PIPELINE_PHASES: PhaseMetadata[] = [
  {
    id: 'DOOR_1',
    order: 1,
    label: 'Door 1: Intake & Format Check',
    shortLabel: 'Door 1',
    description: 'Magic byte check, format validation, hash fingerprinting',
  },
  {
    id: 'SANDBOX',
    order: 2,
    label: 'Sandbox: Dynamic Analysis',
    shortLabel: 'Sandbox',
    description: 'Behavioral scanning, shellcode & macro detonation',
  },
  {
    id: 'DOOR_2',
    order: 3,
    label: 'Door 2: Deep Content Analysis',
    shortLabel: 'Door 2',
    description: 'Embedded script extraction, steganography, CDR sanitization',
  },
  {
    id: 'EXTRACTION',
    order: 4,
    label: 'Extraction: OCR & NER',
    shortLabel: 'Extraction',
    description: 'Vision-based text extraction, key-value entity recognition',
  },
  {
    id: 'VALIDATION',
    order: 5,
    label: 'Validation: Math & Rules',
    shortLabel: 'Validation',
    description: 'Line item tally, tax rate consistency, math verification',
  },
  {
    id: 'MATCHING',
    order: 6,
    label: 'Matching: 3-Way Match',
    shortLabel: 'Matching',
    description: 'Cross-reference with Purchase Orders & Receiving Slips',
  },
  {
    id: 'FRAUD_CHECK',
    order: 7,
    label: 'Fraud Check: Anomaly Detection',
    shortLabel: 'Fraud Check',
    description: 'Vendor bank account changes, duplicate invoice check',
  },
  {
    id: 'APPROVAL_READY',
    order: 8,
    label: 'Approval: Human in the Loop',
    shortLabel: 'Approval',
    description: 'Ready for reviewer sign-off or verification resolution',
  },
];

export const MESSAGE_ACTIONS = {
  UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED',
  DOCUMENT_PROGRESS: 'DOCUMENT_PROGRESS',
  GET_DOCUMENT_STATUS: 'GET_DOCUMENT_STATUS',
  OPEN_SIDEPANEL: 'OPEN_SIDEPANEL',
  CHECK_AUTH: 'CHECK_AUTH',
  AUTH_CHANGED: 'AUTH_CHANGED',
  UPDATE_BADGE: 'UPDATE_BADGE',
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  SHOW_NOTIFICATION: 'SHOW_NOTIFICATION',
  INTERCEPTED_FILE: 'INTERCEPTED_FILE',
};

export const SUPPORTED_FILE_EXTENSIONS = [
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'xml',
  'png',
  'jpg',
  'jpeg',
  'tiff',
];

export const STATUS_COLORS = {
  ALLOW: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    hex: '#10b981',
  },
  QUARANTINE: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    hex: '#f59e0b',
  },
  BLOCK: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    hex: '#ef4444',
  },
  PENDING: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    hex: '#64748b',
  },
  APPROVED: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-800',
    border: 'border-emerald-300',
    hex: '#10b981',
  },
  REJECTED: {
    bg: 'bg-rose-100',
    text: 'text-rose-800',
    border: 'border-rose-300',
    hex: '#ef4444',
  },
  VERIFICATION_REQUESTED: {
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-300',
    hex: '#f59e0b',
  },
};
