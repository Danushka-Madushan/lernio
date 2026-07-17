'use client';

import React from 'react';
import { ShieldOff } from 'lucide-react';

export default function AccountInactiveScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto max-w-md">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-red-100 blur-xl opacity-60 scale-125" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-red-50 to-red-100 shadow-lg ring-1 ring-red-200">
              <ShieldOff size={36} className="text-red-500" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-[#202124]">
          Account Not Active
        </h1>
        <p className="mb-2 text-[15px] leading-relaxed text-[#5f6368]">
          Your account is currently not active.
        </p>
        <p className="text-sm text-[#80868b]">
          Please contact your teacher or staff to reactivate your access.
        </p>

        {/* Decorative card */}
        <div className="mt-8 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left">
          <p className="text-[12px] font-semibold uppercase tracking-widest text-red-400 mb-1">
            What to do
          </p>
          <ul className="space-y-1.5 text-[13px] text-red-700">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">•</span>
              Contact your teacher or admin staff
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">•</span>
              Ask them to extend your account validity period
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 text-red-400">•</span>
              Try logging in again after your account is reactivated
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
