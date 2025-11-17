import React, { useEffect, useRef } from 'react';
import * as authService from '../../services/authService';
import type { User } from '../../types';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const googleButtonRef = useRef<HTMLDivElement>(null);

  const handleCredentialResponse = async (response: any) => {
    try {
      const user = await authService.login(response.credential);
      onLogin(user);
    } catch (error) {
      console.error("Login Failed:", error);
      // You could show an error message to the user here
    }
  };

  useEffect(() => {
    if (window.google && googleButtonRef.current) {
      window.google.accounts.id.initialize({
        // ===================================================================
        // TODO: PASTE YOUR GOOGLE CLIENT ID HERE
        // You can get this from the Google Cloud Console under APIs & Services > Credentials.
        // It should look like '12345-abcde.apps.googleusercontent.com'
        // ===================================================================
        client_id: '1039670019942-4fnpud95ijvaghpou1blets9nm79bf8h.apps.googleusercontent.com',
        callback: handleCredentialResponse,
        use_fedcm_for_prompt: false, // Prevents FedCM NotAllowedError
      });
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        { theme: 'outline', size: 'large', type: 'standard', shape: 'rectangular', text: 'signin_with', logo_alignment: 'left' }
      );
      window.google.accounts.id.prompt(); // Also display the One Tap dialog
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-500 mb-4">
          Brand Ambassador AI
        </h1>
        <p className="text-zinc-300 max-w-xl mx-auto mb-8">
          Your personal AI for generating, scheduling, and posting social media content.
          Log in to get started.
        </p>
      </div>
      <div className="bg-zinc-800 p-8 rounded-lg shadow-xl">
        <div ref={googleButtonRef} />
      </div>
    </div>
  );
};

export default LoginPage;