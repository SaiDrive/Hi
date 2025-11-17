import React from 'react';
import { ContentStatus, ContentType } from '../types';
import type { ContentItem } from '../types';
import Spinner from './Spinner';

interface ContentCardProps {
    item: ContentItem;
    onUpdateStatus: (id: string, status: ContentStatus) => void;
    onSchedule: (item: ContentItem) => void;
    onDelete: (id: string) => void;
}

const ContentCard: React.FC<ContentCardProps> = ({ item, onUpdateStatus, onSchedule, onDelete }) => {
    const renderContent = () => {
        if (item.status === ContentStatus.GENERATING) {
            return (
                <div className="flex flex-col items-center justify-center h-full aspect-square">
                    <Spinner className="w-12 h-12" />
                    <p className="mt-4 text-green-300 animate-pulse text-center">{item.errorMessage || "Generating content..."}</p>
                </div>
            )
        }
        
        if (item.status === ContentStatus.ERROR) {
             return (
                <div className="flex flex-col items-center justify-center h-full aspect-square bg-red-900/20 p-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="mt-4 text-red-300 text-center font-semibold">Generation Failed</p>
                    <p className="mt-2 text-red-400 text-xs text-center">{item.errorMessage}</p>
                </div>
            );
        }

        if (!item.data) {
             return (
                <div className="flex flex-col items-center justify-center h-full aspect-square bg-zinc-700">
                    <p className="text-zinc-400">Content not available.</p>
                </div>
             );
        }

        switch (item.type) {
            case ContentType.TEXT:
                return <p className="text-zinc-300 whitespace-pre-wrap">{item.data}</p>;
            case ContentType.IMAGE:
                return <img src={item.data} alt={item.prompt} className="w-full h-auto object-cover aspect-square" />;
            case ContentType.VIDEO:
                return <video src={item.data} controls className="w-full h-auto object-cover aspect-square" />;
            default:
                return null;
        }
    }

    return (
        <div className="bg-zinc-700 rounded-lg shadow-lg overflow-hidden flex flex-col">
            <div className="p-4 flex-grow">
               {renderContent()}
            </div>
            <div className="bg-zinc-800/50 p-3 flex flex-wrap gap-2 justify-center">
                 {item.status === ContentStatus.PENDING && (
                    <>
                        <button onClick={() => onUpdateStatus(item.id, ContentStatus.APPROVED)} className="flex-1 px-3 py-2 text-sm bg-green-500 hover:bg-green-600 rounded-md transition-colors">Approve</button>
                        <button onClick={() => onUpdateStatus(item.id, ContentStatus.REJECTED)} className="flex-1 px-3 py-2 text-sm bg-yellow-600 hover:bg-yellow-700 rounded-md transition-colors">Reject</button>
                    </>
                )}
                {item.status === ContentStatus.APPROVED && (
                    <button onClick={() => onSchedule(item)} className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-700 rounded-md transition-colors">Schedule Post</button>
                )}
                 {(item.status === ContentStatus.REJECTED || item.status === ContentStatus.ERROR) && (
                     <button onClick={() => onDelete(item.id)} className="w-full px-3 py-2 text-sm bg-red-600 hover:bg-red-700 rounded-md transition-colors">Delete</button>
                 )}
                 {item.status === ContentStatus.SCHEDULED && (
                     <div className="text-center w-full text-xs text-green-300">Scheduled for:<br/>{new Date(item.schedule!).toLocaleString()}</div>
                 )}
                 {item.status === ContentStatus.POSTED && (
                     <div className="text-center w-full text-xs text-green-400 font-bold">Posted!</div>
                 )}
            </div>
        </div>
    );
}

export default ContentCard;