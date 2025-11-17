import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { useLocalStorage } from './hooks/useLocalStorage';
import { ContentType, ContentStatus } from './types';
import type { ContentItem, UserImage } from './types';
import { generateTextContent, generateImageContent, generateVideoContent } from './services/geminiService';
import { startScheduler, stopScheduler } from './services/schedulerService';
import Spinner from './components/Spinner';
import SchedulerModal from './components/SchedulerModal';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

const App: React.FC = () => {
  const [notes, setNotes] = useLocalStorage<string>('brand-ai-notes', 'Example: We are launching a new eco-friendly product line next month. Key features include sustainable materials, recyclable packaging, and a portion of profits going to environmental charities.');
  const [links, setLinks] = useLocalStorage<string>('brand-ai-links', '');
  const [userImages, setUserImages] = useLocalStorage<UserImage[]>('brand-ai-user-images', []);
  const [contentItems, setContentItems] = useLocalStorage<ContentItem[]>('brand-ai-content-items', []);
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
      // Fix: Explicitly type 'file' as File to resolve type inference errors.
      const newImages: UserImage[] = await Promise.all(files.map(async (file: File) => {
        const base64 = await fileToBase64(file);
        return { id: crypto.randomUUID(), name: file.name, base64 };
      }));
      setUserImages(prev => [...prev, ...newImages]);
    }
  };
  
  const removeUserImage = (id: string) => {
    setUserImages(prev => prev.filter(img => img.id !== id));
  };

  const handleGenerate = async (type: ContentType) => {
    setError(null);
    setIsLoading(true);

    const prompt = buildPrompt();
    const newItems: ContentItem[] = [];

    for (let i = 0; i < numToGenerate; i++) {
        const newItem: Omit<ContentItem, 'data' | 'status'> = {
            id: crypto.randomUUID(),
            type,
            prompt,
        };
        
        if (type === ContentType.VIDEO) {
            setContentItems(prev => [...prev, { ...newItem, data: '', status: ContentStatus.GENERATING, errorMessage: 'Initializing video generation...' }]);
        }

        try {
            let data: string;
            switch (type) {
                case ContentType.TEXT:
                    data = await generateTextContent(prompt);
                    break;
                case ContentType.IMAGE:
                    data = await generateImageContent(prompt);
                    break;
                case ContentType.VIDEO:
                    const startImage = userImages[0]; // Use first uploaded image as optional start frame
                    setContentItems(prev => prev.map(item => item.id === newItem.id ? {...item, errorMessage: "Warming up the cameras..."} : item));
                    await new Promise(res => setTimeout(res, 2000));
                    setContentItems(prev => prev.map(item => item.id === newItem.id ? {...item, errorMessage: "Directing the scene..."} : item));
                    data = await generateVideoContent(prompt, startImage);
                    break;
                default:
                    throw new Error('Unsupported content type');
            }
            if (type === ContentType.VIDEO) {
                setContentItems(prev => prev.map(item => item.id === newItem.id ? { ...item, data, status: ContentStatus.PENDING, errorMessage: undefined } : item));
            } else {
                 newItems.push({ ...newItem, data, status: ContentStatus.PENDING });
            }

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
            setError(errorMessage);
            if (type === ContentType.VIDEO) {
                setContentItems(prev => prev.map(item => item.id === newItem.id ? {...item, status: ContentStatus.ERROR, errorMessage } : item));
                if (errorMessage.includes("API key")) {
                    setHasApiKey(false);
                }
            }
        }
    }
    if (newItems.length > 0) {
        setContentItems(prev => [...prev, ...newItems]);
    }

    setIsLoading(false);
  };
  
  const updateContentStatus = (id: string, status: ContentStatus) => {
    setContentItems(prev => prev.map(item => item.id === id ? { ...item, status } : item));
  };
  
  const handleSchedule = (id: string, schedule: string) => {
    setContentItems(prev => prev.map(item => item.id === id ? { ...item, status: ContentStatus.SCHEDULED, schedule } : item));
  };
  
  const deleteContent = (id: string) => {
    setContentItems(prev => prev.filter(item => item.id !== id));
  }

  const renderContentItem = (item: ContentItem) => {
    return (
        <div key={item.id} className="bg-slate-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 flex-grow">
                {item.status === ContentStatus.GENERATING && (
                    <div className="flex flex-col items-center justify-center h-full aspect-square">
                        <Spinner className="w-12 h-12" />
                        <p className="mt-4 text-indigo-300 animate-pulse text-center">{item.errorMessage || "Generating video..."}</p>
                    </div>
                )}
                 {item.status === ContentStatus.ERROR && (
                    <div className="flex flex-col items-center justify-center h-full aspect-square bg-red-900/20 p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="mt-4 text-red-300 text-center font-semibold">Generation Failed</p>
                        <p className="mt-2 text-red-400 text-xs text-center">{item.errorMessage}</p>
                    </div>
                )}
                {item.type === ContentType.TEXT && <p className="text-slate-300 whitespace-pre-wrap">{item.data}</p>}
                {item.type === ContentType.IMAGE && <img src={item.data} alt={item.prompt} className="w-full h-auto object-cover aspect-square" />}
                {item.type === ContentType.VIDEO && item.data && <video src={item.data} controls className="w-full h-auto object-cover aspect-square" />}
            </div>
            <div className="bg-slate-900/50 p-3 flex flex-wrap gap-2 justify-center">
                 {item.status === ContentStatus.PENDING && (
                    <>
                        <button onClick={() => updateContentStatus(item.id, ContentStatus.APPROVED)} className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-md transition-colors">Approve</button>
                        <button onClick={() => updateContentStatus(item.id, ContentStatus.REJECTED)} className="flex-1 px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors">Reject</button>
                    </>
                )}
                {item.status === ContentStatus.APPROVED && (
                    <button onClick={() => setSchedulingItem(item)} className="w-full px-3 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors">Schedule Post</button>
                )}
                 {(item.status === ContentStatus.REJECTED || item.status === ContentStatus.ERROR) && (
                     <button onClick={() => deleteContent(item.id)} className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors">Delete</button>
                 )}
                 {item.status === ContentStatus.SCHEDULED && (
                     <div className="text-center w-full text-xs text-cyan-300">Scheduled for:<br/>{new Date(item.schedule!).toLocaleString()}</div>
                 )}
                 {item.status === ContentStatus.POSTED && (
                     <div className="text-center w-full text-xs text-green-400 font-bold">Posted!</div>
                 )}
            </div>
        </div>
    );
  };
  
  const renderScheduleFeed = () => {
      const scheduled = contentItems.filter(i => i.status === ContentStatus.SCHEDULED).sort((a,b) => new Date(a.schedule!).getTime() - new Date(b.schedule!).getTime());
      const posted = contentItems.filter(i => i.status === ContentStatus.POSTED);
      return (
          <div className="mt-8">
              <h2 className="text-2xl font-bold mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">Scheduler & Feed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-slate-300">Scheduled Posts</h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {scheduled.length > 0 ? scheduled.map(renderContentItem) : <p className="text-slate-500">No posts scheduled.</p>}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-xl font-semibold mb-3 text-slate-300">Posted History</h3>
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {posted.length > 0 ? posted.map(renderContentItem) : <p className="text-slate-500">No posts have been published yet.</p>}
                      </div>
                  </div>
              </div>
          </div>
      )
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {schedulingItem && <SchedulerModal item={schedulingItem} onClose={() => setSchedulingItem(null)} onSchedule={handleSchedule}/>}
      <header className="bg-slate-800/50 backdrop-blur-sm p-4 sticky top-0 z-10 border-b border-slate-700">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">
          Brand Ambassador AI
        </h1>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Inputs & Generation */}
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
                                <div key={img.id} className="relative group">
                                    <img src={`data:image/png;base64,${img.base64}`} alt={img.name} className="h-16 w-16 object-cover rounded-md"/>
                                    <button onClick={() => removeUserImage(img.id)} className="absolute top-0 right-0 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">&times;</button>
                                </div>
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

            {/* Right Column: Review */}
            <div className="bg-slate-800 p-6 rounded-lg shadow-xl">
                 <h2 className="text-2xl font-bold mb-4 text-indigo-400 border-b-2 border-slate-700 pb-2">3. Review & Approve</h2>
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4 max-h-[80vh] overflow-y-auto pr-2">
                    {contentItems.filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status)).length === 0 && !isLoading && (
                        <p className="text-slate-500 sm:col-span-2 text-center py-10">Your generated content will appear here for review.</p>
                    )}
                    {contentItems
                      .filter(i => [ContentStatus.PENDING, ContentStatus.APPROVED, ContentStatus.REJECTED, ContentStatus.GENERATING, ContentStatus.ERROR].includes(i.status))
                      .sort((a, b) => (contentItems.indexOf(b) - contentItems.indexOf(a))) // Show newest first
                      .map(renderContentItem)}
                 </div>
            </div>
        </div>
        
        {renderScheduleFeed()}
      </main>
    </div>
  );
};

export default App;
