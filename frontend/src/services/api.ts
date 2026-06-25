import axios from 'axios';
import type {
  AuthResponse,
  DocumentDetail,
  DocumentVersionInfo,
  PaginatedDocuments,
  UserProfile,
} from '../types';

/** Klucz tokenu w localStorage. */
export const TOKEN_KEY = 'dokformat_token';

/** Instancja axios z bazowym URL-em API. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});

// Dodaje nagłówek Authorization z tokenem z localStorage.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Przy 401 (poza endpointami auth) czyści token i przekierowuje na logowanie.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url ?? '';
    if (error.response?.status === 401 && !url.includes('/auth/')) {
      localStorage.removeItem(TOKEN_KEY);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

/** API uwierzytelniania. */
export const authApi = {
  register: (data: { email: string; password: string; name?: string }) =>
    api.post<AuthResponse>('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),
  google: (credential: string) =>
    api.post<AuthResponse>('/auth/google', { credential }).then((r) => r.data),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }).then((r) => r.data),
};

/** API profilu użytkownika. */
export const usersApi = {
  getMe: () => api.get<UserProfile>('/users/me').then((r) => r.data),
  updateMe: (data: { name?: string }) =>
    api.patch<UserProfile>('/users/me', data).then((r) => r.data),
};

/** API dokumentów. */
export const documentsApi = {
  createFromText: (data: { title?: string; rawText: string }) =>
    api.post<{ id: string }>('/documents/text', data).then((r) => r.data),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ id: string }>('/documents/upload', form).then((r) => r.data);
  },
  list: (page = 1, limit = 12) =>
    api
      .get<PaginatedDocuments>('/documents', { params: { page, limit } })
      .then((r) => r.data),
  get: (id: string) => api.get<DocumentDetail>(`/documents/${id}`).then((r) => r.data),
  versions: (id: string) =>
    api.get<DocumentVersionInfo[]>(`/documents/${id}/versions`).then((r) => r.data),
  editByPrompt: (id: string, instruction: string) =>
    api.post<DocumentDetail>(`/documents/${id}/edit`, { instruction }).then((r) => r.data),
  saveContent: (id: string, html: string) =>
    api.put<DocumentDetail>(`/documents/${id}/content`, { html }).then((r) => r.data),
  restore: (id: string, versionNo: number) =>
    api.post<DocumentDetail>(`/documents/${id}/restore/${versionNo}`).then((r) => r.data),
  download: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }).then((r) => r),
  /** Pobiera najnowszy .docx jako Blob do za\u0142adowania w edytorze SuperDoc. */
  file: (id: string) =>
    api.get(`/documents/${id}/file`, { responseType: 'blob' }).then((r) => r.data as Blob),
  /** Zapisuje wyeksportowany z edytora .docx jako now\u0105 wersj\u0119. */
  saveFile: (id: string, blob: Blob) => {
    const form = new FormData();
    form.append(
      'file',
      new File([blob], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    return api.put<DocumentDetail>(`/documents/${id}/file`, form).then((r) => r.data);
  },
  /** Ujednolica styl dokumentu przez AI (na \u017c\u0105danie). */
  standardize: (id: string) =>
    api.post<DocumentDetail>(`/documents/${id}/standardize`).then((r) => r.data),
  remove: (id: string) => api.delete<{ success: true }>(`/documents/${id}`).then((r) => r.data),
};

export default api;
