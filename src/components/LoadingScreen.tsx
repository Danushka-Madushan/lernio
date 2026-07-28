import Image from 'next/image';

/**
 * Full-page loading screen shown by Next.js App Router during server component loading.
 * Matches the header/body style of both dashboard and admin layouts.
 */
const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 z-9998 flex items-center justify-center bg-[#f8f9fa]">
      <div className="flex flex-col items-center gap-6 select-none animate-[fadeIn_0.4s_ease_both]">
        {/* Logo with soft glow + pulse ring */}
        <div className="relative flex items-center justify-center">
          {/* ambient glow */}
          <div className="absolute w-20 h-20 rounded-full bg-blue-400/20 blur-xl" />

          {/* pulsing ring */}
          <span className="absolute w-16 h-16 rounded-2xl border-2 border-blue-400/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />

          {/* logo mark */}
          <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-[0_2px_20px_rgba(59,130,246,0.15)]">
            <div className="relative w-8 h-8">
              <Image
                src="/icon.svg"
                alt="Lernio"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        </div>

        {/* Wordmark */}
        <span className="text-2xl font-semibold tracking-tight text-gray-600 animate-[fadeIn_0.4s_0.1s_ease_both]">
          Lernio
        </span>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 animate-[fadeIn_0.4s_0.2s_ease_both]">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[bounce_1.2s_ease-in-out_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[bounce_1.2s_0.15s_ease-in-out_infinite]" />
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-[bounce_1.2s_0.3s_ease-in-out_infinite]" />
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
