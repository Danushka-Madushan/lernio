'use client';

import { useEffect, useState } from 'react';
import ReAuthenticateModal from '@/components/ReAuthenticateModal';

/**
 * AdminContent
 *
 * Client-side shell that wraps all admin panel children.
 * Listens for the global `lernio:unauthorized` custom DOM event, which any
 * admin page can fire when it receives an unexpected HTTP 401 response.
 * On that event it surfaces the ReAuthenticateModal.
 */
export const AdminContent = ({ children }: { children: React.ReactNode }) => {
  const [showReAuth, setShowReAuth] = useState(false);

  useEffect(() => {
    const handler = () => setShowReAuth(true);
    window.addEventListener('lernio:unauthorized', handler);
    return () => window.removeEventListener('lernio:unauthorized', handler);
  }, []);

  return (
    <>
      {showReAuth && (
        <ReAuthenticateModal onClose={() => setShowReAuth(false)} />
      )}
      {children}
    </>
  );
};
