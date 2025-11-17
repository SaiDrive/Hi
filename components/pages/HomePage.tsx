
import React from 'react';
import type { User } from '../../types';

interface HomePageProps {
  user: User;
}

const HomePage: React.FC<HomePageProps> = ({ user }) => {
  return (
    <div className="bg-slate-800 p-8 rounded-lg shadow-xl animate-fade-in">
      <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500 mb-4">
        Welcome, {user.name}!
      </h1>
      <p className="text-slate-300 text-lg mb-6">
        This is your central hub for creating amazing social media content.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-indigo-400 mb-2">Get Started</h2>
          <p className="text-slate-400">
            Navigate to the <span className="font-bold text-indigo-300">Generator</span> to start creating text, image, or video posts. Upload your assets in the <span className="font-bold text-indigo-300">Library</span>.
          </p>
        </div>
        <div className="bg-slate-900/50 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold text-indigo-400 mb-2">Your Workflow</h2>
          <ol className="list-decimal list-inside text-slate-400 space-y-1">
            <li>Provide context in the Generator.</li>
            <li>Generate various content types.</li>
            <li>Review, approve, and schedule your posts.</li>
            <li>Watch your brand grow!</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
