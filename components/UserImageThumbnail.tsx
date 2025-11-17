import React from 'react';
import type { UserImage } from '../types';

interface UserImageThumbnailProps {
  image: UserImage;
  onRemove: (id: string) => void;
}

const UserImageThumbnail: React.FC<UserImageThumbnailProps> = ({ image, onRemove }) => {
  return (
    <div className="relative group h-16 w-16">
      <img src={image.url} alt={image.name} className="h-16 w-16 object-cover rounded-md" />
      <button
        onClick={() => onRemove(image.id)}
        className="absolute top-0 right-0 -mt-1 -mr-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10"
        aria-label={`Remove ${image.name}`}
      >
        &times;
      </button>
    </div>
  );
};

export default UserImageThumbnail;