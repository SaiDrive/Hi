
import React from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import type { User, UserImage } from '../../types';
import UserImageThumbnail from '../UserImageThumbnail';
import * as gcsService from '../../services/gcsService';

interface LibraryPageProps {
  user: User;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ user }) => {
  const userId = user.id;
  const [userImages, setUserImages] = useLocalStorage<UserImage[]>('brand-ai-user-images', [], userId);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages: UserImage[] = await Promise.all(
        files.map(async (file: File) => {
          const url = await gcsService.uploadFile(file, 'uploads', userId);
          return { id: crypto.randomUUID(), name: file.name, url };
        })
      );
      setUserImages(prev => [...prev, ...newImages]);
      // Reset file input
      e.target.value = '';
    }
  };

  const removeUserImage = async (id: string) => {
    const imageToRemove = userImages.find(img => img.id === id);
    if (imageToRemove) {
      await gcsService.deleteGcsContent(imageToRemove.url, userId);
    }
    setUserImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b-2 border-slate-700 pb-2">
        <h2 className="text-2xl font-bold text-indigo-400 mb-2 sm:mb-0">My Image Library</h2>
        <label htmlFor="library-upload" className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold text-sm transition text-center">
            Upload New Image
        </label>
        <input id="library-upload" type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {userImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {userImages.map(img => (
            <UserImageThumbnail key={img.id} image={img} onRemove={removeUserImage} userId={userId} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-slate-500">Your library is empty.</p>
          <p className="text-slate-400 mt-2">Upload images to use them in video generation.</p>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
