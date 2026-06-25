/** Wspólne typy domenowe współdzielone przez frontend. */

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type DocumentSource = 'PASTE' | 'TXT' | 'DOCX';
export type VersionOrigin = 'AI_FORMAT' | 'AI_EDIT' | 'MANUAL';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UserProfile extends AuthUser {
  createdAt: string;
  documentsCount: number;
}

export interface DocumentListItem {
  id: string;
  title: string;
  status: DocumentStatus;
  sourceType: DocumentSource;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentVersionInfo {
  id: string;
  versionNo: number;
  origin: VersionOrigin;
  instruction: string | null;
  createdAt: string;
}

export interface DocumentDetail {
  id: string;
  title: string;
  status: DocumentStatus;
  sourceType: DocumentSource;
  createdAt: string;
  updatedAt: string;
  latestVersion: {
    versionNo: number;
    html: string;
    origin: VersionOrigin;
    createdAt: string;
  } | null;
}

export interface PaginatedDocuments {
  items: DocumentListItem[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}
