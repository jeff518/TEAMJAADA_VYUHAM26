/**
 * SecureDoc Pipeline - API Client with JWT Auth and Auto-Refresh
 */

import { API_ENDPOINTS, DEFAULT_BACKEND_URL } from './constants';
import { getToken, getSettings, refreshToken as doRefreshToken } from './auth';
import {
  ApiResponse,
  Document,
  PipelineStatus,
  AuditEntry,
  DashboardStats,
  UserProfile,
} from './types';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_BACKEND_URL;
  }

  /**
   * Ensure latest base URL is used from settings
   */
  private async getBaseUrl(): Promise<string> {
    if (this.baseUrl && this.baseUrl !== DEFAULT_BACKEND_URL) {
      return this.baseUrl;
    }
    const settings = await getSettings();
    this.baseUrl = settings.backendUrl || DEFAULT_BACKEND_URL;
    return this.baseUrl;
  }

  /**
   * Internal request executor with automatic Authorization header and 401 retry
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuth = true
  ): Promise<ApiResponse<T>> {
    try {
      const baseUrl = await this.getBaseUrl();
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
      const url = `${baseUrl.replace(/\/+$/, '')}${cleanEndpoint}`;

      const token = await getToken();
      const headers = new Headers(options.headers || {});

      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      // If body is not FormData and Content-Type is not set, set application/json
      if (
        options.body &&
        !(options.body instanceof FormData) &&
        !headers.has('Content-Type')
      ) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized with token refresh and single retry
      if (response.status === 401 && retryOnAuth) {
        const refreshedToken = await doRefreshToken();
        if (refreshedToken) {
          return this.request<T>(endpoint, options, false);
        }
      }

      const contentType = response.headers.get('content-type');
      let data: any = null;

      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!response.ok) {
        const errorMessage =
          (data && (data.error || data.message || data.detail)) ||
          `Request failed with status ${response.status}`;
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Normalize response structure
      if (data && typeof data === 'object' && 'data' in data) {
        return {
          success: true,
          data: data.data,
          message: data.message,
        };
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (err: any) {
      console.error(`API request error on ${endpoint}:`, err);
      return {
        success: false,
        error: err.message || 'Network request failed or server unreachable',
      };
    }
  }

  /**
   * Health check for backend connection
   */
  public async checkHealth(): Promise<ApiResponse<{ status: string; version?: string }>> {
    return this.request<{ status: string; version?: string }>(API_ENDPOINTS.HEALTH, {
      method: 'GET',
    });
  }

  /**
   * User login
   */
  public async login(
    email: string,
    password: string
  ): Promise<ApiResponse<{ token: string; refreshToken?: string; user: UserProfile }>> {
    return this.request<{ token: string; refreshToken?: string; user: UserProfile }>(
      API_ENDPOINTS.LOGIN,
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );
  }

  /**
   * User registration
   */
  public async register(
    email: string,
    password: string,
    name: string
  ): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    return this.request<{ token: string; user: UserProfile }>(
      API_ENDPOINTS.REGISTER,
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      },
      false
    );
  }

  /**
   * Refresh JWT token
   */
  public async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const newToken = await doRefreshToken();
    if (newToken) {
      return { success: true, data: { token: newToken } };
    }
    return { success: false, error: 'Could not refresh authentication token' };
  }

  /**
   * Upload a document to the pipeline
   */
  public async uploadDocument(
    file: File | Blob,
    filename: string,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file, filename);

    if (metadata) {
      formData.append('metadata', JSON.stringify(metadata));
    }

    return this.request<Document>(API_ENDPOINTS.UPLOAD, {
      method: 'POST',
      body: formData,
    });
  }

  /**
   * Fetch documents with optional filtering
   */
  public async getDocuments(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<ApiResponse<Document[]>> {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'ALL') {
      params.append('status', filters.status);
    }
    if (filters?.limit) {
      params.append('limit', filters.limit.toString());
    }
    if (filters?.offset) {
      params.append('offset', filters.offset.toString());
    }
    if (filters?.search) {
      params.append('search', filters.search);
    }

    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<Document[]>(`${API_ENDPOINTS.DOCUMENTS}${query}`, {
      method: 'GET',
    });
  }

  /**
   * Fetch a single document by ID
   */
  public async getDocument(id: string): Promise<ApiResponse<Document>> {
    return this.request<Document>(API_ENDPOINTS.DOCUMENT_BY_ID(id), {
      method: 'GET',
    });
  }

  /**
   * Fetch pipeline execution status for a document
   */
  public async getDocumentStatus(id: string): Promise<ApiResponse<PipelineStatus>> {
    return this.request<PipelineStatus>(API_ENDPOINTS.DOCUMENT_STATUS(id), {
      method: 'GET',
    });
  }

  /**
   * Fetch full real-time telemetry (OCR text, VLM entities, DTE math validation)
   */
  public async getDocumentTelemetry(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/api/v1/documents/${id}/telemetry`, {
      method: 'GET',
    });
  }

  /**
   * Approve a document
   */
  public async approveDocument(
    id: string,
    comments?: string
  ): Promise<ApiResponse<Document>> {
    return this.request<Document>(API_ENDPOINTS.APPROVE(id), {
      method: 'POST',
      body: JSON.stringify({ comments: comments || 'Approved by user via extension' }),
    });
  }

  /**
   * Reject a document
   */
  public async rejectDocument(
    id: string,
    reason: string
  ): Promise<ApiResponse<Document>> {
    return this.request<Document>(API_ENDPOINTS.REJECT(id), {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  /**
   * Request verification / clarification for a document
   */
  public async requestVerification(
    id: string,
    questions: string[]
  ): Promise<ApiResponse<Document>> {
    return this.request<Document>(API_ENDPOINTS.VERIFY(id), {
      method: 'POST',
      body: JSON.stringify({ questions }),
    });
  }

  /**
   * Fetch audit trail for a document
   */
  public async getAuditTrail(documentId: string): Promise<ApiResponse<AuditEntry[]>> {
    return this.request<AuditEntry[]>(API_ENDPOINTS.DOCUMENT_AUDIT(documentId), {
      method: 'GET',
    });
  }

  /**
   * Fetch dashboard metrics and counts
   */
  public async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request<DashboardStats>(API_ENDPOINTS.STATS, {
      method: 'GET',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
