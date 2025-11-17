export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum ContentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  POSTED = 'posted',
  GENERATING = 'generating',
  ERROR = 'error',
}

export enum Page {
  HOME = 'home',
  GENERATOR = 'generator',
  LIBRARY = 'library',
}

export interface ContentItem {
  id: string;
  type: ContentType;
  data: string; // Public URL for all content types
  prompt: string;
  status: ContentStatus;
  schedule?: string; // ISO string for date/time
  errorMessage?: string;
}

export interface UserImage {
  id: string;
  name: string;
  url: string; // Public URL for the uploaded image
}

export interface User {
  id: string;
  name: string;
  email: string;
}

declare global {
  interface Window {
    google?: any;
  }
}