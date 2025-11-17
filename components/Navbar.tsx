
import React, { useState } from 'react';
import { Page, type User } from '../types';

interface NavbarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
  user: User;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onLogout, user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { page: Page.HOME, label: 'Home' },
    { page: Page.GENERATOR, label: 'Generator' },
    { page: Page.LIBRARY, label: 'Library' },
  ];

  const NavLink: React.FC<{ page: Page, label: string }> = ({ page, label }) => (
      <button
          onClick={() => { onNavigate(page); setIsMenuOpen(false); }}
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              currentPage === page
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-300 hover:bg-zinc-700 hover:text-white'
          }`}
      >
          {label}
      </button>
  );

  return (
    <nav className="bg-zinc-800/70 backdrop-blur-sm sticky top-0 z-20 border-b border-zinc-700">
      <div className="container mx-auto px-4">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-500">
              Brand AI
            </h1>
            <div className="hidden md:block md:ml-6">
              <div className="flex space-x-4">
                  {navItems.map(item => <NavLink key={item.page} {...item} />)}
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <span className="text-sm text-zinc-400">Welcome, {user.name}</span>
            <button
              onClick={onLogout}
              className="px-3 py-2 rounded-md text-sm font-medium text-zinc-300 bg-zinc-700 hover:bg-red-600 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="absolute inset-y-0 right-0 flex items-center md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map(item => <NavLink key={item.page} {...item} />)}
          </div>
           <div className="pt-4 pb-3 border-t border-zinc-700">
                <div className="flex items-center px-5">
                    <div className="ml-3">
                        <div className="text-base font-medium leading-none text-white">{user.name}</div>
                        <div className="text-sm font-medium leading-none text-zinc-400">{user.email}</div>
                    </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                    <button
                        onClick={onLogout}
                        className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-zinc-400 hover:text-white hover:bg-zinc-700"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;