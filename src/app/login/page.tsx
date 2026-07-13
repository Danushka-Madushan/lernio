'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get('callbackUrl') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clear errors when typing
  useEffect(() => {
    if (error) setError('');
  }, [username, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#e8eaed] bg-white p-8 shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)] transition-all duration-150">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-medium tracking-tight text-[#202124] select-none">
          Lernio
        </h1>
        <p className="mt-1.5 text-md text-[#5f6368]">
          E Wisdom Institute
        </p>
      </div>

      {error && (
        <div
          className="mb-4 rounded-lg border border-[#fad2cf] bg-[#fce8e6] p-2.5 text-xs text-[#c5221f]"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="username"
            className="mb-1.5 block text-xs font-medium text-[#5f6368]"
          >
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#9aa0a6]">
              <UserIcon size={16} />
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-[#dadce0] bg-white py-2.5 pl-10 pr-3 text-sm text-[#202124] placeholder-[#9aa0a6] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-xs font-medium text-[#5f6368]"
          >
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#9aa0a6]">
              <Lock size={16} />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-[#dadce0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#202124] placeholder-[#9aa0a6] outline-none transition-all duration-150 hover:border-[#c4c7cc] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 disabled:bg-[#f1f3f4] disabled:text-[#9aa0a6]"
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#5f6368] outline-none hover:text-[#202124] focus-visible:text-[#1a73e8]"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-full bg-[#1a73e8] py-2.5 px-4 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md active:scale-[0.98] active:bg-[#185abc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={16} /> Logging in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 font-sans">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-2xl border border-[#e8eaed] bg-white p-8 flex items-center justify-center shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]">
          <Loader2 className="animate-spin text-[#1a73e8]" size={24} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
