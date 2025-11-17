import type { ContentItem } from '../types';
import { ContentStatus } from '../types';
import type { Dispatch, SetStateAction } from 'react';

let intervalId: number | null = null;

export const startScheduler = (
  contentItems: ContentItem[],
  // Fix: Use Dispatch and SetStateAction types from react to avoid namespace error.
  setContentItems: Dispatch<SetStateAction<ContentItem[]>>
) => {
  if (intervalId) {
    clearInterval(intervalId);
  }

  intervalId = window.setInterval(() => {
    const now = new Date();
    let updated = false;

    const newContentItems = contentItems.map(item => {
      if (item.status === ContentStatus.SCHEDULED && item.schedule && new Date(item.schedule) <= now) {
        updated = true;
        return { ...item, status: ContentStatus.POSTED };
      }
      return item;
    });

    if (updated) {
      setContentItems(newContentItems);
    }
  }, 1000 * 10); // Check every 10 seconds
};

export const stopScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
};
