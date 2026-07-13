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
    <div className="w-full max-w-md rounded-radius-md border border-[#141a20] bg-black p-space-6 shadow-2xl transition-all duration-instant">
      <div className="mb-space-5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white select-none">
          Lernio Video
        </h1>
        <p className="mt-space-1 text-xs text-text-tertiary">
          Tuition platform student & admin portal
        </p>
      </div>

      {error && (
        <div
          className="mb-space-3 rounded-radius-xs bg-red-950/50 border border-red-800 p-space-2 text-xs text-red-400"
          role="alert"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-space-3">
        <div>
          <label
            htmlFor="username"
            className="block text-xs font-medium text-text-tertiary mb-space-1"
          >
            Username
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-space-2 text-text-tertiary">
              <UserIcon size={16} />
            </span>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-full rounded-radius-xs border border-[#141a20] bg-[#141a20] py-space-2 pl-space-5 pr-space-2 text-text-inverse placeholder-text-tertiary text-xs outline-none transition-all duration-instant focus:border-surface-raised focus:ring-1 focus:ring-surface-raised disabled:opacity-50"
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-text-tertiary mb-space-1"
          >
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-space-2 text-text-tertiary">
              <Lock size={16} />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="w-full rounded-radius-xs border border-[#141a20] bg-[#141a20] py-space-2 pl-space-5 pr-space-5 text-text-inverse placeholder-text-tertiary text-xs outline-none transition-all duration-instant focus:border-surface-raised focus:ring-1 focus:ring-surface-raised disabled:opacity-50"
              placeholder="Enter password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={loading}
              className="absolute inset-y-0 right-0 flex items-center pr-space-2 text-text-tertiary hover:text-text-inverse focus-visible:text-surface-raised outline-none"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-radius-xs bg-surface-raised py-space-2 px-space-3 text-xs font-semibold text-black transition-all duration-instant hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white outline-none disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="mr-space-1 animate-spin" size={16} /> Logging in...
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
    <div className="flex min-h-screen items-center justify-center bg-[#0a0e12] px-space-3 font-sans">
      <Suspense fallback={
        <div className="w-full max-w-md rounded-radius-md border border-[#141a20] bg-black p-space-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-surface-raised" size={24} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
