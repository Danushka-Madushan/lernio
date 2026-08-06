import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: '404 - Page Not Found | Lernio',
  description: 'The page you are looking for does not exist.',
};

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-[#f8f9fa] px-4 py-6 font-sans overflow-hidden">

      {/* Subtle radial background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(59,130,246,0.07) 0%, transparent 70%)',
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#e8eaed] bg-white p-8 text-center shadow-[0_1px_2px_0_rgba(60,64,67,0.3),0_2px_6px_2px_rgba(60,64,67,0.15)]">

        {/* Logo */}
        <Image
          src="/icon.svg"
          alt="Lernio"
          width={44}
          height={44}
          className="mx-auto mb-6 select-none"
          priority
        />

        {/* 404 number */}
        <p
          aria-hidden="true"
          className="select-none text-[80px] font-semibold leading-none tracking-tighter"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1557b0 60%, #0d47a1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          404
        </p>

        {/* Heading */}
        <h1 className="mt-3 text-[18px] font-medium tracking-tight text-[#202124]">
          Page not found
        </h1>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-[#5f6368]">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
        </p>

        {/* Divider */}
        <div className="my-6 border-t border-[#e8eaed]" />

        {/* Back to Login */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-[#1765cc] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <ArrowLeft size={15} />
          Back to Login
        </Link>
      </div>
    </div>
  );
}
