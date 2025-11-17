import React, { useState, useEffect } from 'react';
import { Page, type User } from './types';
import * as authService from './services/authService';
import LoginPage from './components/pages/LoginPage';
import HomePage from './components/pages/HomePage';
import GeneratorPage from './components/pages/GeneratorPage';
import LibraryPage from './components/pages/LibraryPage';
import Navbar from './components/Navbar';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>(Page.HOME);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error("Session check failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setCurrentPage(Page.HOME);
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

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
    <div className="min-h-screen bg-zinc-900 text-zinc-200 font-sans flex flex-col">
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