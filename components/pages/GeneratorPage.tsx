import React, { useState, useEffect, useCallback } from 'react';
import { ContentType, ContentStatus } from '../../types';
import type { ContentItem, UserImage, User } from '../../types';
import { startScheduler, stopScheduler } from '../../services/schedulerService';
import { api } from '../../services/api';
import Spinner from '../Spinner';
import SchedulerModal from '../SchedulerModal';
import ContentCard from '../ContentCard';
import UserImageThumbnail from '../UserImageThumbnail';

interface GeneratorPageProps {
  user: User;
}

const GeneratorPage: React.FC<GeneratorPageProps> = ({ user }) => {
  const [notes, setNotes] = useState('Example: We are launching a new eco-friendly product line next month. Key features include sustainable materials, recyclable packaging, and a portion of profits going to environmental charities.');
  const [links, setLinks] = useState('');
  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<ContentItem | null>(null);
  const [numToGenerate, setNumToGenerate] = useState(1);
  
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [notesRes, imagesRes, contentRes] = await Promise.all([
        api.get<{notes: string, links: string}>('/data/context'),
        api.get<UserImage[]>('/images'),
        api.get<ContentItem[]>('/content')
      ]);
      setNotes(notesRes.notes || '');
      setLinks(notesRes.links || '');
      setUserImages(imagesRes);
      setContentItems(contentRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load initial data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    startScheduler(contentItems, setContentItems);
    return () => stopScheduler();
  }, [contentItems]);
  
  const handleContextSave = async () => {
     try {
       await api.post('/data/context', { notes, links });
       // Maybe show a small success toast/message
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Failed to save context.');
     }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setIsLoading(true);
      try {
        const uploadedImages: UserImage[] = await Promise.all(
          files.map(async (file) => {
            // Fix: Explicitly type the response from the api.post call.
            const { uploadUrl, newImage } = await api.post<{ uploadUrl: string; newImage: UserImage }>('/images/upload-url', {
              fileName: file.name,
              contentType: file.type,
            });
            await fetch(uploadUrl, { method: 'PUT', body: file });
            return newImage;
          })
        );
        setUserImages(prev => [...prev, ...uploadedImages]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'File upload failed.');
      } finally {
        setIsLoading(false);
      }
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

  const handleGenerate = async (type: ContentType) => {
    setError(null);
    const tempItems: ContentItem[] = Array.from({ length: numToGenerate }, () => ({
      id: crypto.randomUUID(),
      type,
      prompt: '', // Prompt is now handled backend, but we need a placeholder
      data: '',
      status: ContentStatus.GENERATING,
      errorMessage: type === ContentType.VIDEO ? 'Initializing generation...' : undefined
    }));
    
    setContentItems(prev => [...tempItems, ...prev]);

    try {
       const generationPayload = {
         type,
         context: { notes, links },
         count: numToGenerate,
         startImageId: type === ContentType.VIDEO ? userImages[0]?.id : undefined,
       };
       // This endpoint would start the generation process on the backend
       // For a long process like video, it should return immediately
       // and the status would be updated via polling or websockets.
       // For this simulation, we'll await a response of the new items.
       const newItems = await api.post<ContentItem[]>('/content/generate', generationPayload);
       
       // Replace temp items with real items from the backend
       setContentItems(prev => [
         ...newItems,
         ...prev.filter(p => !tempItems.some(t => t.id === p.id))
       ]);
       
    } catch (err) {
       const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
       setError(errorMessage);
       // Update temp items to show error status
       setContentItems(prev => prev.map(item => {
         const tempItem = tempItems.find(t => t.id === item.id);
         return tempItem ? { ...item, status: ContentStatus.ERROR, errorMessage } : item;
       }));
    }
  };
  
  const updateContentStatus = async (id: string, status: ContentStatus) => {
    try {
      const updatedItem = await api.patch<ContentItem>(`/content/${id}/status`, { status });
      setContentItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status.');
    }
  };
  
  const handleSchedule = async (id: string, schedule: string) => {
    try {
      const updatedItem = await api.patch<ContentItem>(`/content/${id}/schedule`, { schedule });
      setContentItems(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule post.');
    }
  };
  
  const deleteContent = async (id: string) => {
    try {
      await api.delete(`/content/${id}`);
      setContentItems(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content.');
    }
  }
  
  const renderScheduleFeed = () => {
      const scheduled = contentItems.filter(i => i.status === ContentStatus.SCHEDULED).sort((a,b) => new Date(a.schedule!).getTime() - new Date(b.schedule!).getTime());
      const posted = contentItems.filter(i => i.status === ContentStatus.POSTED);
      
      const renderList = (items: ContentItem[], emptyText: string) => (
         <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {items.length > 0 ? items.map(item => 
                <ContentCard 
                    key={item.id} 
                    item={item} 
                    onUpdateStatus={updateContentStatus} 
                    onSchedule={setSchedulingItem} 
                    onDelete={deleteContent}
                />
            ) : <p className="text-zinc-500">{emptyText}</p>}
        </div>
      );

      return (
          <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-green-400 border-b-2 border-zinc-700 pb-2">Scheduler & Feed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-zinc-300">Scheduled Posts</h3>
                      {renderList(scheduled, "No posts scheduled.")}
                  </div>
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-zinc-300">Posted History</h3>
                      {renderList(posted, "No posts have been published yet.")}
                  </div>
              </div>
          </div>
      )
  };

  return (
    <>
      {schedulingItem && <SchedulerModal item={schedulingItem} onClose={() => setSchedulingItem(null)} onSchedule={handleSchedule}/>}
      
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-zinc-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 text-green-400 border-b-2 border-zinc-700 pb-2">1. Provide Context</h2>
                 <div className="space-y-4">
                     <div>
                         <label htmlFor="notes" className="block text-sm font-medium text-zinc-300 mb-1">Personal Notes / Brief</label>
                         <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={handleContextSave} rows={6} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"></textarea>
                     </div>
                     <div>
                         <label htmlFor="links" className="block text-sm font-medium text-zinc-300 mb-1">Blog / Article Links (one per line)</label>
                         <textarea id="links" value={links} onChange={(e) => setLinks(e.target.value)} onBlur={handleContextSave} rows={3} className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"></textarea>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-zinc-300 mb-1">Upload Your Pictures (optional, for video)</label>
                         <input type="file" multiple accept="image/*" onChange={handleFileChange} className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"/>
                         <div className="mt-2 flex flex-wrap gap-2">
                            {userImages.map(img => (
                                <UserImageThumbnail key={img.id} image={img} onRemove={removeUserImage} />
                            ))}
                         </div>
                     </div>
                 </div>

                 <h2 className="text-2xl font-bold mt-8 mb-4 text-green-400 border-b-2 border-zinc-700 pb-2">2. Generate Content</h2>
                 {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</div>}
                 <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="num-generate" className="text-sm font-medium text-zinc-300">Posts to generate:</label>
                    <input type="number" id="num-generate" value={numToGenerate} onChange={e => setNumToGenerate(Math.max(1, parseInt(e.target.value)))} min="1" max="5" className="w-20 bg-zinc-900 border border-zinc-700 rounded-md p-2"/>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <button onClick={() => handleGenerate(ContentType.TEXT)} disabled={isLoading} className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 rounded-md font-semibold flex items-center justify-center transition">
                        {isLoading ? <Spinner /> : 'Generate Text'}
                     </button>
                     <button onClick={() => handleGenerate(ContentType.IMAGE)} disabled={isLoading} className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 rounded-md font-semibold flex items-center justify-center transition">
                        {isLoading ? <Spinner /> : 'Generate Image'}
                     </button>
                     <button onClick={() => handleGenerate(ContentType.VIDEO)} disabled={isLoading} className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 rounded-md font-semibold flex items-center justify-center transition">
                        {isLoading ? <Spinner /> : 'Generate Video'}
                     </button>
                 </div>
            </div>

            <div className="bg-zinc-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 text-green-400 border-b-2 border-zinc-700 pb-2">3. Review & Approve</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto pr-2">
                    {contentItems.filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status)).length === 0 && !isLoading && (
                        <p className="text-zinc-500 sm:col-span-2 text-center py-10">Your generated content will appear here for review.</p>
                    )}
                    {contentItems
                      .filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status))
                      .map(item => <ContentCard key={item.id} item={item} onUpdateStatus={updateContentStatus} onSchedule={setSchedulingItem} onDelete={deleteContent} />)}
                 </div>
            </div>
        </div>
        
        {renderScheduleFeed()}
    </>
  );
};

export default GeneratorPage;