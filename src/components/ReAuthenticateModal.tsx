'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldAlert, LogIn, Loader2 } from 'lucide-react';
import { Button } from '@heroui/react';

/**
 * ReAuthenticateModal
 *
 * Shown when the admin panel detects an unexpected 401 Unauthorized response.
 * The admin presses "Re-authenticate" to be redirected to the login page.
 * This avoids losing the page state until the user explicitly chooses to act.
 */
const ReAuthenticateModal = ({ onClose }: { onClose: () => void }) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleReAuth = async () => {
    setLoading(true);
    try {
      // Clear the session cookie before redirecting
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore — we're redirecting regardless
    }
    router.push('/login');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reauth-title"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => e.key === 'Escape' && !loading && onClose()}
    >
      {/* Modal Surface */}
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">

        {/* Header — danger-toned gradient */}
        <div className="relative bg-linear-to-br from-red-500 via-red-600 to-[#b91c1c] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ShieldAlert size={18} className="text-white" />
            </div>
            <div>
              <p id="reauth-title" className="text-[15px] font-semibold text-white">Session Expired</p>
              <p className="text-[12px] text-red-100">Your admin session is no longer valid</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-[#5f6368] leading-relaxed">
            An unauthorized error was detected. This can happen when your session
            expires after a period of inactivity.
          </p>
          <p className="mt-2 text-sm text-[#5f6368] leading-relaxed">
            Please re-authenticate to continue managing the panel.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-[#e8eaed] bg-[#f8f9fa] px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onPress={onClose}
            isDisabled={loading}
          >
            Dismiss
          </Button>
          <Button
            type="button"
            onPress={handleReAuth}
            isDisabled={loading}
            isPending={loading}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            {({ isPending }) => (
              <>
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                Re-authenticate
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ReAuthenticateModal;
