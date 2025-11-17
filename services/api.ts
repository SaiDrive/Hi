import { getToken } from './authService';

// In a real app, this would be an environment variable.
const API_BASE_URL = '/api'; // Using a relative URL for proxying in development

/**
 * BACKEND API BLUEPRINT
 * This is the contract the frontend expects the backend to fulfill.
 *
 * --------------------------------------------------------------------------
 * AUTHENTICATION
 * --------------------------------------------------------------------------
 * POST /api/auth/google
 *   - Body: { token: string } // Google ID Token
 *   - Response: { token: string, user: User } // Session JWT and user object
 *
 * GET /api/auth/me
 *   - Headers: { Authorization: "Bearer <session_token>" }
 *   - Response: User
 *
 * --------------------------------------------------------------------------
 * USER DATA (Notes/Links)
 * --------------------------------------------------------------------------
 * GET /api/data/context
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Response: { notes: string, links: string }
 *
 * POST /api/data/context
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Body: { notes: string, links: string }
 *   - Response: { success: true }
 *
 * --------------------------------------------------------------------------
 * IMAGE LIBRARY
 * --------------------------------------------------------------------------
 * GET /api/images
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Response: UserImage[]
 *
 * POST /api/images/upload-url
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Body: { fileName: string, contentType: string }
 *   - Response: { uploadUrl: string, newImage: UserImage } // Pre-signed GCS URL
 *
 * DELETE /api/images/:id
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Response: { success: true }
 *
 * --------------------------------------------------------------------------
 * GENERATED CONTENT
 * --------------------------------------------------------------------------
 * GET /api/content
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Response: ContentItem[]
 *
 * POST /api/content/generate
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Body: { type: ContentType, context: { notes, links }, count: number, startImageId?: string }
 *   - Response: ContentItem[] (the newly created items)
 *
 * PATCH /api/content/:id/status
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Body: { status: ContentStatus }
 *   - Response: ContentItem (the updated item)
 *
 * PATCH /api/content/:id/schedule
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Body: { schedule: string } // ISO date string
 *   - Response: ContentItem (the updated item)
 *
 * DELETE /api/content/:id
 *   - Headers: { Authorization: "Bearer <token>" }
 *   - Response: { success: true }
 * --------------------------------------------------------------------------
 */

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(errorData.message || 'An API error occurred');
    }
    // Handle cases with no response body (e.g., DELETE 204)
    if (response.status === 204) {
      return {} as T;
    }
    return response.json();
  } catch (error) {
    console.error(`API request failed: ${options.method || 'GET'} ${url}`, error);
    throw error;
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body: unknown) => request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};