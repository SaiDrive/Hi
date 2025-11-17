
import type { User } from '../types';

const USER_STORAGE_KEY = 'brand-ai-current-user';

export const login = (): User => {
  const mockUser: User = {
    id: 'mock-user-123',
    name: 'Demo User',
    email: 'demo@example.com',
  };
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(mockUser));
  return mockUser;
};

export const logout = (): void => {
  localStorage.removeItem(USER_STORAGE_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem(USER_STORAGE_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Failed to parse user from storage', error);
    return null;
  }
};
