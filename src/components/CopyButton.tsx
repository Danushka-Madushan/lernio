"use client";

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const copyText = async (text: string): Promise<boolean> => {
  if (!text) return false;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* fallthrough */ }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    return true;
  } catch { return false; }
}


// ─── CopyButton ───────────────────────────────────────────────────────────────
const CopyButton = ({ text, label, variant = 'ghost', tiny = false }: {
  text: string; label?: string; variant?: 'ghost' | 'solid'; tiny?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  const handle = async () => {
    if (!(await copyText(text))) return;
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button type="button" disabled={!text} onClick={handle}
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition-all disabled:opacity-40',
        tiny ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
        variant === 'solid'
          ? 'bg-blue-500 text-white shadow-sm hover:bg-[#1765cc]'
          : 'text-blue-500 hover:bg-blue-100',
      ].join(' ')}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {label && <span>{copied ? 'Copied!' : label}</span>}
    </button>
  );
}

export default CopyButton;
