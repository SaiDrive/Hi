import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserImage } from '../../types';
import UserImageThumbnail from '../UserImageThumbnail';
import { api } from '../../services/api';
import Spinner from '../Spinner';

interface LibraryPageProps {
  user: User;
}

const LibraryPage: React.FC<LibraryPageProps> = ({ user }) => {
  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const images = await api.get<UserImage[]>('/images');
      setUserImages(images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load images.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setIsLoading(true);
      setError(null);
      try {
        const uploadedImages: UserImage[] = await Promise.all(
          files.map(async (file) => {
            // 1. Get a secure upload URL from the backend
            // Fix: Explicitly type the response from the api.post call.
            const { uploadUrl, newImage } = await api.post<{ uploadUrl: string; newImage: UserImage }>('/images/upload-url', {
              fileName: file.name,
              contentType: file.type,
            });
            // 2. Upload the file directly to the URL (e.g., to GCS)
            await fetch(uploadUrl, { method: 'PUT', body: file });
            // 3. The backend has already created the DB record, return it
            return newImage;
          })
        );
        setUserImages(prev => [...prev, ...uploadedImages]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File upload failed.');
      } finally {
        setIsLoading(false);
      }
      e.target.value = ''; // Reset file input
    }
  };

  const removeUserImage = async (id: string) => {
    try {
      await api.delete(`/images/${id}`);
      setUserImages(prev => prev.filter(img => img.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete image.');
    }
  };

  return (
    <div className="bg-zinc-800 p-6 rounded-lg shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 border-b-2 border-zinc-700 pb-2">
        <h2 className="text-2xl font-bold text-green-400 mb-2 sm:mb-0">My Image Library</h2>
        <label htmlFor="library-upload" className="cursor-pointer px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md font-semibold text-sm transition text-center">
            Upload New Image
        </label>
        <input id="library-upload" type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" disabled={isLoading}/>
      </div>

      {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</div>}

      {isLoading && userImages.length === 0 ? (
        <div className="text-center py-16">
          <Spinner className="w-10 h-10 mx-auto" />
        </div>
      ) : userImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
          {userImages.map(img => (
            <UserImageThumbnail key={img.id} image={img} onRemove={removeUserImage} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-zinc-500">Your library is empty.</p>
          <p className="text-zinc-400 mt-2">Upload images to use them in video generation.</p>
        </div>
      )}
    </div>
  );
};

export default LibraryPage;