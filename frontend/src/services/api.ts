import axios from 'axios';

// Resolve configuration URLs with development fallbacks
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8001/api';
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8001/api/ws';

export interface Job {
  id: string;
  document_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'FINALIZED';
  current_stage: string;
  progress: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProcessedResult {
  id: string;
  document_id: string;
  job_id: string;
  title: string;
  category: string;
  summary: string;
  keywords: string[];
  metadata_json: Record<string, any>;
  is_finalized: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentDetails {
  id: string;
  filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
  latest_job: Job | null;
  processed_result: ProcessedResult | null;
}

export interface DocumentUpdatePayload {
  filename?: string;
  title?: string;
  category?: string;
  summary?: string;
  keywords?: string[];
  metadata_json?: Record<string, any>;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
  // Upload endpoints
  uploadDocuments: async (files: File[]): Promise<DocumentDetails[]> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    const response = await apiClient.post<DocumentDetails[]>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Document endpoints
  getDocuments: async (): Promise<DocumentDetails[]> => {
    const response = await apiClient.get<DocumentDetails[]>('/documents');
    return response.data;
  },

  getDocument: async (id: string): Promise<DocumentDetails> => {
    const response = await apiClient.get<DocumentDetails>(`/documents/${id}`);
    return response.data;
  },

  updateDocument: async (id: string, payload: DocumentUpdatePayload): Promise<DocumentDetails> => {
    const response = await apiClient.put<DocumentDetails>(`/documents/${id}`, payload);
    return response.data;
  },

  finalizeDocument: async (id: string): Promise<DocumentDetails> => {
    const response = await apiClient.post<DocumentDetails>(`/documents/${id}/finalize`);
    return response.data;
  },

  // Job endpoints
  getJobs: async (): Promise<Job[]> => {
    const response = await apiClient.get<Job[]>('/jobs');
    return response.data;
  },

  getJob: async (id: string): Promise<Job> => {
    const response = await apiClient.get<Job>(`/jobs/${id}`);
    return response.data;
  },

  retryJob: async (id: string): Promise<Job> => {
    const response = await apiClient.post<Job>(`/jobs/${id}/retry`);
    return response.data;
  },

  // Export URLs
  getExportJsonUrl: (): string => `${API_BASE_URL}/export/json`,
  getExportCsvUrl: (): string => `${API_BASE_URL}/export/csv`,
};
