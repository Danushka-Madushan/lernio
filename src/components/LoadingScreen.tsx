import Image from 'next/image';
import { Loader2 } from 'lucide-react';

/**
 * Full-page loading screen shown by Next.js App Router during server component loading.
 * Matches the header/body style of both dashboard and admin layouts.
 */
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-9998 flex flex-col items-center justify-center bg-[#f8f9fa]">
      {/* Logo */}
      <div className="flex flex-col items-center gap-5 select-none">
        <div className="relative flex items-center gap-3 animate-[fadeSlideUp_0.35s_ease_both]">
          <div className="relative w-11 h-11 drop-shadow-md">
            <Image
              src="/icon.svg"
              alt="Lernio"
              fill
              className="object-contain"
              priority
            />
          </div>
          <span className="text-[26px] font-semibold tracking-tight text-blue-500">
            Lernio
          </span>
        </div>

        {/* Spinner */}
        <div className="animate-[fadeSlideUp_0.35s_0.1s_ease_both_forwards] opacity-0">
          <Loader2
            size={28}
            className="animate-spin text-blue-400"
            strokeWidth={2}
          />
        </div>
      </div>
    </div>
  );
}
