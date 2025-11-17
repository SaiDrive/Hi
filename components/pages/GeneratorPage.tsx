
import React, { useState, useEffect, useCallback } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { ContentType, ContentStatus } from '../../types';
import type { ContentItem, UserImage, User } from '../../types';
import { generateTextContent, generateImageContent, generateVideoContent } from '../../services/geminiService';
import { startScheduler, stopScheduler } from '../../services/schedulerService';
import * as gcsService from '../../services/gcsService';
import Spinner from '../Spinner';
import SchedulerModal from '../SchedulerModal';
import ContentCard from '../ContentCard';
import UserImageThumbnail from '../UserImageThumbnail';

interface GeneratorPageProps {
  user: User;
}

const GeneratorPage: React.FC<GeneratorPageProps> = ({ user }) => {
  const userId = user.id;
  const [notes, setNotes] = useLocalStorage<string>('brand-ai-notes', 'Example: We are launching a new eco-friendly product line next month. Key features include sustainable materials, recyclable packaging, and a portion of profits going to environmental charities.', userId);
  const [links, setLinks] = useLocalStorage<string>('brand-ai-links', '', userId);
  const [userImages, setUserImages] = useLocalStorage<UserImage[]>('brand-ai-user-images', [], userId);
  const [contentItems, setContentItems] = useLocalStorage<ContentItem[]>('brand-ai-content-items', [], userId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedulingItem, setSchedulingItem] = useState<ContentItem | null>(null);
  const [numToGenerate, setNumToGenerate] = useState(1);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    startScheduler(contentItems, setContentItems);
    return () => stopScheduler();
  }, [contentItems, setContentItems]);
  
  const checkApiKey = useCallback(async () => {
      if (window.aistudio) {
        const keyStatus = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(keyStatus);
      }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);
  
  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    await checkApiKey();
  };

  const buildPrompt = () => {
    let fullPrompt = `**My Personal Notes:**\n${notes}\n\n`;
    if (links) {
      fullPrompt += `**Reference Articles/Links:**\n${links}\n\n`;
    }
    fullPrompt += "Based on the information above, please generate a social media post.";
    return fullPrompt;
  };
  
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
    }
  };
  
  const removeUserImage = async (id: string) => {
    const imageToRemove = userImages.find(img => img.id === id);
    if(imageToRemove) {
      await gcsService.deleteGcsContent(imageToRemove.url, userId);
    }
    setUserImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerate = async (type: ContentType) => {
    setError(null);
    setIsLoading(true);

    const prompt = buildPrompt();
    const generationPromises = Array.from({ length: numToGenerate }, async () => {
        const tempId = crypto.randomUUID();
        
        if (type === ContentType.VIDEO) {
            const placeholderItem: ContentItem = { id: tempId, type, prompt, data: '', status: ContentStatus.GENERATING, errorMessage: 'Initializing video generation...' };
            setContentItems(prev => [...prev, placeholderItem]);
        }
        
        try {
            let dataUrl: string;
            switch (type) {
                case ContentType.TEXT: {
                    const textData = await generateTextContent(prompt);
                    dataUrl = await gcsService.uploadText(textData, 'generated/text', userId);
                    break;
                }
                case ContentType.IMAGE: {
                    const imageDataUrl = await generateImageContent(prompt);
                    const blob = await (await fetch(imageDataUrl)).blob();
                    dataUrl = await gcsService.uploadFile(blob, 'generated/images', userId);
                    break;
                }
                case ContentType.VIDEO: {
                    const startImage = userImages[0];
                    let startImageBase64: string | undefined;
                    if (startImage) {
                        const dataUrl = await gcsService.getContent(startImage.url, userId);
                        if (dataUrl) {
                            startImageBase64 = dataUrl.split(',')[1];
                        }
                    }
                    
                    setContentItems(prev => prev.map(item => item.id === tempId ? {...item, errorMessage: "Warming up the cameras..."} : item));
                    await new Promise(res => setTimeout(res, 2000));
                    setContentItems(prev => prev.map(item => item.id === tempId ? {...item, errorMessage: "Directing the scene..."} : item));
                    
                    const videoBlobUrl = await generateVideoContent(prompt, startImageBase64);
                    const blob = await (await fetch(videoBlobUrl)).blob();
                    URL.revokeObjectURL(videoBlobUrl);
                    dataUrl = await gcsService.uploadFile(blob, 'generated/videos', userId);
                    break;
                }
                default:
                    throw new Error('Unsupported content type');
            }

            const newItem: ContentItem = { id: tempId, type, prompt, data: dataUrl, status: ContentStatus.PENDING };
            if (type === ContentType.VIDEO) {
                setContentItems(prev => prev.map(item => item.id === tempId ? newItem : item));
            } else {
                return newItem;
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            if (type === ContentType.VIDEO) {
                setContentItems(prev => prev.map(item => item.id === tempId ? {...item, status: ContentStatus.ERROR, errorMessage } : item));
                if (errorMessage.includes("API key")) {
                    setHasApiKey(false);
                }
            } else {
                 console.error("Generation failed for an item:", errorMessage);
            }
            return null;
        }
    });

    const results = await Promise.all(generationPromises);
    const successfulItems = results.filter((item): item is ContentItem => item !== null);
    if(successfulItems.length > 0) {
        setContentItems(prev => [...prev, ...successfulItems]);
    }
    
    setIsLoading(false);
  };
  
  const updateContentStatus = (id: string, status: ContentStatus) => {
    setContentItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };
  
  const handleSchedule = (id: string, schedule: string) => {
    setContentItems(prev => prev.map(item => item.id === id ? { ...item, status: ContentStatus.SCHEDULED, schedule } : item));
  };
  
  const deleteContent = async (id: string) => {
    const itemToDelete = contentItems.find(item => item.id === id);
    if (itemToDelete && itemToDelete.data) {
        await gcsService.deleteGcsContent(itemToDelete.data, userId);
    }
    setContentItems(prev => prev.filter(item => item.id !== id));
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
                    userId={userId}
                />
            ) : <p className="text-slate-500">{emptyText}</p>}
        </div>
      );

      return (
          <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">Scheduler & Feed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-slate-300">Scheduled Posts</h3>
                      {renderList(scheduled, "No posts scheduled.")}
                  </div>
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-slate-300">Posted History</h3>
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
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">1. Provide Context</h2>
                 <div className="space-y-4">
                     <div>
                         <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">Personal Notes / Brief</label>
                         <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
                     </div>
                     <div>
                         <label htmlFor="links" className="block text-sm font-medium text-slate-300 mb-1">Blog / Article Links (one per line)</label>
                         <textarea id="links" value={links} onChange={(e) => setLinks(e.target.value)} rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"></textarea>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-300 mb-1">Upload Your Pictures (optional, for video)</label>
                         <input type="file" multiple accept="image/*" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"/>
                         <div className="mt-2 flex flex-wrap gap-2">
                            {userImages.map(img => (
                                <UserImageThumbnail key={img.id} image={img} onRemove={removeUserImage} userId={userId} />
                            ))}
                         </div>
                     </div>
                 </div>

                 <h2 className="text-2xl font-bold mt-8 mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">2. Generate Content</h2>
                 {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4 text-sm">{error}</div>}
                 <div className="flex items-center gap-4 mb-4">
                    <label htmlFor="num-generate" className="text-sm font-medium text-slate-300">Posts to generate:</label>
                    <input type="number" id="num-generate" value={numToGenerate} onChange={e => setNumToGenerate(Math.max(1, parseInt(e.target.value)))} min="1" max="5" className="w-20 bg-slate-900 border border-slate-700 rounded-md p-2"/>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <button onClick={() => handleGenerate(ContentType.TEXT)} disabled={isLoading} className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 rounded-md font-semibold flex items-center justify-center transition">
                        {isLoading ? <Spinner /> : 'Generate Text'}
                     </button>
                     <button onClick={() => handleGenerate(ContentType.IMAGE)} disabled={isLoading} className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 rounded-md font-semibold flex items-center justify-center transition">
                        {isLoading ? <Spinner /> : 'Generate Image'}
                     </button>
                    {hasApiKey ? (
                         <button onClick={() => handleGenerate(ContentType.VIDEO)} disabled={isLoading} className="px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 rounded-md font-semibold flex items-center justify-center transition">
                            {isLoading ? <Spinner /> : 'Generate Video'}
                         </button>
                     ) : (
                         <div className="flex flex-col items-center justify-center gap-2 p-2 bg-slate-700/50 rounded-lg">
                            <button onClick={handleSelectKey} className="w-full text-center px-2 py-1 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-md font-semibold transition-colors">Select API Key</button>
                            <p className="text-xs text-center text-slate-400">Video generation requires an API key.</p>
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:underline">Billing Info</a>
                         </div>
                     )}
                 </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">3. Review & Approve</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto pr-2">
                    {contentItems.filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status)).length === 0 && !isLoading && (
                        <p className="text-slate-500 sm:col-span-2 text-center py-10">Your generated content will appear here for review.</p>
                    )}
                    {contentItems
                      .filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status))
                      .sort((a, b) => {
                        const indexA = contentItems.findIndex(item => item.id === a.id);
                        const indexB = contentItems.findIndex(item => item.id === b.id);
                        return indexB - indexA;
                      })
                      .map(item => <ContentCard key={item.id} item={item} onUpdateStatus={updateContentStatus} onSchedule={setSchedulingItem} onDelete={deleteContent} userId={userId} />)}
                 </div>
            </div>
        </div>
        
        {renderScheduleFeed()}
    </>
  );
};

export default GeneratorPage;
