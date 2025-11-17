
import React, { useState } from 'react';
import type { ContentItem } from '../types';

interface SchedulerModalProps {
  item: ContentItem;
  onClose: () => void;
  onSchedule: (id: string, schedule: string) => void;
}

const SchedulerModal: React.FC<SchedulerModalProps> = ({ item, onClose, onSchedule }) => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5); // Default to 5 mins in the future
  now.setSeconds(0);
  now.setMilliseconds(0);

  const [schedule, setSchedule] = useState(now.toISOString().slice(0, 16));

  const handleSchedule = () => {
    if (schedule) {
      onSchedule(item.id, new Date(schedule).toISOString());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-zinc-800 rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-green-400">Schedule Post</h2>
        <p className="mb-4 text-zinc-300">Select a date and time to post this content.</p>
        <div className="mb-6">
          <label htmlFor="schedule-time" className="block text-sm font-medium text-zinc-400 mb-2">
            Post at:
          </label>
          <input
            type="datetime-local"
            id="schedule-time"
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            min={new Date().toISOString().slice(0, 16)}
          />
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-zinc-600 hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSchedule}
            className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors font-semibold"
          >
            Confirm Schedule
          </button>
        </div>
      </div>
    </div>
  );
};

export default SchedulerModal;