
import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

// Fix: Use Dispatch and SetStateAction types from react to avoid namespace error.
export function useLocalStorage<T,>(key: string, initialValue: T, userId: string | null): [T, Dispatch<SetStateAction<T>>] {
  const userKey = userId ? `${userId}_${key}` : key;

  const [storedValue, setStoredValue] = useState<T>(() => {
    if (!userId) return initialValue;
    try {
      const item = window.localStorage.getItem(userKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  useEffect(() => {
    if (!userId) return;
    try {
      const valueToStore =
        typeof storedValue === 'function'
          ? storedValue(storedValue)
          : storedValue;
      window.localStorage.setItem(userKey, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  }, [userKey, storedValue, userId]);

  return [storedValue, setStoredValue];
}
