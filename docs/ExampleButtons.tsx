"use client";

import { Button } from '@heroui/react';
import { Copy, Check, LogOut, Loader2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Example Buttons Collection
 * 
 * DESIGN.md References:
 * - Button Shapes: 8px (`rounded-md/lg`) for standard buttons, pill shape (`rounded-full`) for inline icon buttons.
 * - Colors: High contrast buttons against neutral backgrounds.
 * - Text: Standard UI button font sizes (12px / 14px).
 */

// ── Custom Pill Action Button (like CopyButton) ──
export function ExampleCustomActionButton({ text = "Copy Text" }: { text?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button type="button" 
      onClick={() => setCopied(!copied)}
      className="inline-flex shrink-0 items-center gap-1 rounded-full font-medium transition-all px-2.5 py-1.5 text-xs text-blue-500 hover:bg-blue-100 disabled:opacity-40">
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span>{copied ? 'Copied!' : text}</span>
    </button>
  );
}

// ── HeroUI Default Secondary/Outline Button (like LogoutButton) ──
export function ExampleOutlineButton({ loading = false }: { loading?: boolean }) {
  return (
    <Button
      isDisabled={loading}
      variant='outline'
      size='sm'
      className="font-normal border-[#e8eaed] text-[#5f6368] hover:bg-[#f8f9fa]"
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <LogOut size={14} />
      )}
      Standard Action
    </Button>
  );
}

// ── HeroUI Primary Button ──
export function ExamplePrimaryHeroUIButton({ loading = false }: { loading?: boolean }) {
  return (
    <Button
      isDisabled={loading}
      variant="primary"
      size='md'
      className="font-medium bg-[#3b82f6] text-white"
    >
      Primary Action
    </Button>
  );
}
