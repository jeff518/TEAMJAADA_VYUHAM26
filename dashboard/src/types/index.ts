export type DocumentStatus = 'ALLOW' | 'QUARANTINE' | 'BLOCK' | 'PENDING' | 'PROCESSING';

export type UserRole = 'admin' | 'security_officer' | 'auditor' | 'operator';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
  lastLogin?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface SecurityCheckItem {
  id: string;
  name: string;
  status: 'PASSED' | 'FAILED' | 'WARNING' | 'SKIPPED';
  details: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any>;
}

export interface Door1Result {
  passed: boolean;
  status: DocumentStatus;
  clamavScan: {
    scanned: boolean;
    clean: boolean;
    signature?: string;
    scanDurationMs: number;
  };
  mimeValidation: {
    claimedMime: string;
    detectedMime: string;
    magicBytesValid: boolean;
    extensionMatchesMime: boolean;
  };
  fileLimits: {
    sizeBytes: number;
    maxSizeBytes: number;
    isWithinLimit: boolean;
  };
  quarantineReason?: string;
  checks: SecurityCheckItem[];
}

export interface Door2Result {
  passed: boolean;
  status: DocumentStatus;
  structureValid: boolean;
  scriptMacroCheck: {
    hasJavascript: boolean;
    hasMacros: boolean;
    hasEmbeddedStreams: boolean;
    hasObfuscation: boolean;
  };
  pdfAnalysis: {
    pageCount: number;
    isEncrypted: boolean;
    suspiciousObjectsCount: number;
    openActionsDetected: boolean;
  };
  checks: SecurityCheckItem[];
}

export interface Door3Result {
  passed: boolean;
  status: DocumentStatus;
  ocrConfidence: number;
  hallucinationScore: number;
  promptInjectionDetected: boolean;
  schemaValid: boolean;
  extractionModel: string;
  checks: SecurityCheckItem[];
}

export interface Door4Result {
  passed: boolean;
  status: DocumentStatus;
  threeWayMatchScore: number;
  duplicateDetected: boolean;
  duplicateOfDocId?: string;
  vendorBankAnomaly: boolean;
  amountAnomaly: boolean;
  riskScore: number; // 0 - 100
  checks: SecurityCheckItem[];
}

export interface SecurityResults {
  door1: Door1Result;
  door2: Door2Result;
  door3: Door3Result;
  door4: Door4Result;
  overallScore: number;
  overallStatus: DocumentStatus;
}

export interface InvoiceLineItem {
  id: string;
  itemNumber: number;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  matchedPoItem?: boolean;
}

export interface ExtractedData {
  invoiceNumber: string;
  poNumber: string;
  vendorName: string;
  vendorAddress: string;
  vendorTaxId: string;
  vendorIban: string;
  vendorSwift: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  paymentTerms: string;
  lineItems: InvoiceLineItem[];
  rawTextPreview?: string;
}

export interface MatchingResults {
  status: 'MATCH' | 'PARTIAL_MATCH' | 'MISMATCH';
  overallScore: number; // 0 - 100
  poMatch: {
    matched: boolean;
    poNumber: string;
    expectedTotal: number;
    actualTotal: number;
    variancePercentage: number;
    lineItemsScore: number;
    discrepancies: string[];
  };
  goodsReceiptMatch: {
    matched: boolean;
    receiptNumber: string;
    deliveredQuantityScore: number;
    pendingDeliveries: number;
    notes: string;
  };
  vendorVerification: {
    isRegisteredVendor: boolean;
    bankDetailsMatch: boolean;
    registeredIban: string;
    invoiceIban: string;
    vendorRating: string;
  };
  fraudFlags: string[];
}

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'failed' | 'pending' | 'skipped';
  timestamp?: string;
  durationMs?: number;
  doorRef?: 'door1' | 'door2' | 'door3' | 'door4';
}

export interface ApprovalRecord {
  id: string;
  documentId: string;
  status: 'APPROVED' | 'REJECTED' | 'VERIFICATION_REQUESTED' | 'PENDING';
  decidedBy?: string;
  decidedByEmail?: string;
  decidedAt?: string;
  comment?: string;
  policyTriggered?: string;
}

export interface AuditLogEntry {
  id: string;
  documentId: string;
  timestamp: string;
  action: string;
  actor: string;
  actorRole: string;
  eventDetails: Record<string, any>;
  prevHash: string;
  currentHash: string;
  isHashValid: boolean;
}

export interface DocumentItem {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  sha256: string;
  uploadedAt: string;
  updatedAt: string;
  uploadedBy: string;
  status: DocumentStatus;
  overallRiskScore: number;
  pipelineSteps: PipelineStep[];
  securityResults: SecurityResults;
  extractedData?: ExtractedData;
  matchingResults?: MatchingResults;
  approval: ApprovalRecord;
  auditTrail: AuditLogEntry[];
}

export interface DashboardStats {
  totalDocuments: number;
  pendingApproval: number;
  blockedDocuments: number;
  processedToday: number;
  averageProcessingTimeMs: number;
  quarantinedDocuments: number;
  activityTrends: {
    date: string;
    processed: number;
    blocked: number;
    approved: number;
  }[];
  statusBreakdown: {
    status: DocumentStatus;
    count: number;
    percentage: number;
  }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DocumentFilterParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  vendor?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface ApprovalActionPayload {
  documentId: string;
  action: 'APPROVE' | 'REJECT' | 'REQUEST_VERIFICATION';
  comment?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}
