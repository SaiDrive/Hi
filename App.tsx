
import React, { useState, useEffect } from 'react';
import { Page, type User } from './types';
import * as authService from './services/authService';
import LoginPage from './components/pages/LoginPage';
import HomePage from './components/pages/HomePage';
import GeneratorPage from './components/pages/GeneratorPage';
import LibraryPage from './components/pages/LibraryPage';
import Navbar from './components/Navbar';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  
  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);

  const handleLogin = () => {
    const user = authService.login();
    setCurrentUser(user);
    setCurrentPage(Page.HOME);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  const renderPage = () => {
    if (!currentUser) return null;

    switch (currentPage) {
      case Page.HOME:
        return <HomePage user={currentUser} />;
      case Page.GENERATOR:
        return <GeneratorPage user={currentUser} />;
      case Page.LIBRARY:
        return <LibraryPage user={currentUser} />;
      default:
        return <HomePage user={currentUser} />;
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
        user={currentUser}
      />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
