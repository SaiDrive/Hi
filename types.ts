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

export interface ContentItem {
  id: string;
  type: ContentType;
  data: string; // URL for image/video, text content for text
  prompt: string;
  status: ContentStatus;
  schedule?: string; // ISO string for date/time
  errorMessage?: string;
}

export interface UserImage {
  id: string;
  name: string;
  base64: string;
}

// Fix: Add global window.aistudio type definition. This was moved from geminiService.ts to resolve a conflict.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
