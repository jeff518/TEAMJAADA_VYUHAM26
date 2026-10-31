/**
 * SecureDoc Pipeline - TypeScript Interface Definitions
 */

export type SecurityDecision = 'ALLOW' | 'QUARANTINE' | 'BLOCK';
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ApprovalDecision = 'PENDING' | 'APPROVED' | 'REJECTED' | 'VERIFICATION_REQUESTED';
export type PipelinePhaseStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type PipelinePhase =
  | 'DOOR_1'
  | 'SANDBOX'
  | 'DOOR_2'
  | 'EXTRACTION'
  | 'VALIDATION'
  | 'MATCHING'
  | 'FRAUD_CHECK'
  | 'APPROVAL_READY';

export type DocumentOverallStatus =
  | 'QUEUED'
  | 'SCANNING'
  | 'QUARANTINED'
  | 'BLOCKED'
  | 'PROCESSING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'FAILED';

export interface SecurityCheck {
  name: string;
  passed: boolean;
  details: string;
  severity: SecuritySeverity;
}

export interface SecurityResult {
  door: string;
  decision: SecurityDecision;
  checks: SecurityCheck[];
  timestamp: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  itemCode?: string;
}

export interface ExtractionResult {
  invoiceNumber: string;
  vendorName: string;
  vendorAddress?: string;
  buyerName: string;
  buyerAddress?: string;
  invoiceDate: string;
  dueDate?: string;
  lineItems: LineItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  poNumber?: string;
  confidence: number;
}

export interface MatchingResult {
  poMatch: boolean;
  receiptMatch: boolean;
  invoiceMatch: boolean;
  overallScore: number;
  discrepancies: string[];
}

export interface ApprovalStatus {
  status: ApprovalDecision;
  reviewer?: string;
  timestamp?: string;
  comments?: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details: string;
  hash: string;
  previousHash?: string;
}

export interface Document {
  id: string;
  filename: string;
  fileSize?: number;
  mimeType?: string;
  sourceUrl?: string;
  status: DocumentOverallStatus;
  uploadedAt: string;
  securityResults?: SecurityResult[];
  extractionResults?: ExtractionResult;
  matchingResults?: MatchingResult;
  approvalStatus?: ApprovalStatus;
  auditTrail?: AuditEntry[];
}

export interface PipelineStatus {
  phase: PipelinePhase;
  status: PipelinePhaseStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface UploadProgress {
  documentId: string;
  filename: string;
  progress: number;
  phase: PipelinePhase;
  status: 'QUEUED' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error?: string;
}

export interface UserSettings {
  backendUrl: string;
  authToken?: string;
  autoUpload: boolean;
  notifications: boolean;
  interceptDownloads?: boolean;
  interceptDragDrop?: boolean;
  interceptEmails?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  blocked: number;
  quarantined: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: UserProfile;
}

export interface ExtensionMessage<T = unknown> {
  action: string;
  payload?: T;
  source?: 'popup' | 'sidepanel' | 'content' | 'background';
}
