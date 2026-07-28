"use client";

import { Key, X } from 'lucide-react';
import CopyButton from './CopyButton';
import CredentialPill from './CredentialPill';
import WhatsAppButton from './WhatsAppButton';

interface ShareInfo {
  username: string;
  password: string;
}

const buildShareMessage = (username: string, password: string): string => {
  return [
    'Hi, Here are your Lernio logins',
    '',
    `Username: ${username}`,
    `Password: ${password}`,
    '',
    'Having issues? Contact +94 70 700 8041',
  ].join('\n');
}

const ShareCredentialsCard = ({ info, onDismiss }: { info: ShareInfo; onDismiss: () => void }) => {
  const message = buildShareMessage(info.username, info.password);
  return (
    <div className="my-5 overflow-hidden rounded-2xl shadow-lg ring-1 ring-black/5">
      <div className="relative bg-linear-to-br from-blue-500 via-[#1557b0] to-[#0d47a1] px-4 py-4">
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm">
              <Key size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white">Student Credentials</p>
              <p className="mt-0.5 text-[11px] leading-tight text-blue-200">Ready to share · {info.username}</p>
            </div>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss"
            className="rounded-full p-1.5 text-white/50 transition-colors hover:bg-white/15 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="space-y-2 bg-white px-4 py-4">
        <CredentialPill label="Username" value={info.username} />
        <CredentialPill label="Password" value={info.password} />
        <div className="pt-1">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#9aa0a6]">Share Message</p>
          <div className="relative overflow-hidden rounded-xl border border-[#c7d2fe] bg-[#eef2ff]">
            <div className="absolute left-2.5 top-2.5 z-10 flex items-center gap-1.5">
              <CopyButton text={message} label="Copy" variant="solid" tiny />
              <WhatsAppButton text={message} label="WhatsApp" tiny />
            </div>
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(circle, #3730a3 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
            <textarea readOnly value={message} rows={6}
              className="relative w-full resize-none bg-transparent px-4 pb-4 pt-11 text-[12.5px] leading-[1.75] text-[#3730a3] outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareCredentialsCard;
