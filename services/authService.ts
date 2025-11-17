import type { User } from '../types';
import { api } from './api';

const TOKEN_KEY = 'brand-ai-auth-token';

export const login = async (googleToken: string): Promise<User> => {
  // The backend is expected to take the Google token, verify it,
  // find or create a user, and return a session token (JWT).
  // Fix: Explicitly type the response from the api.post call.
  const response = await api.post<{ token: string; user: User }>('/auth/google', { token: googleToken });
  if (response.token && response.user) {
    localStorage.setItem(TOKEN_KEY, response.token);
    return response.user as User;
  }
  throw new Error('Login failed: Invalid response from server.');
};

export const logout = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

export const getCurrentUser = async (): Promise<User | null> => {
  const token = getToken();
  if (!token) {
    return null;
  }
  try {
    // This endpoint should be protected. The backend verifies the token
    // and returns the corresponding user data.
    const user = await api.get<User>('/auth/me');
    return user;
  } catch (error) {
    console.error('Failed to fetch current user, token might be invalid.', error);
    logout(); // Clear invalid token
    return null;
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};