"use client";

import { Check, Info, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const REQUIRED_ZOOM_SCOPES = [
  { scope: 'meeting:write:meeting:admin' },
  { scope: 'meeting:read:meeting:admin' },
  { scope: 'meeting:update:meeting:admin' },
  { scope: 'meeting:delete:meeting:admin' },
  { scope: 'user:read:user:admin' },
];

export function ZoomScopesInfoButton() {
  const [open, setOpen] = useState(false);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});
  const btnRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const calcPosition = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const popupWidth = 240; // Reduced from 288 (w-60 instead of w-72)
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;

    // Prefer below; flip above if not enough room
    const openBelow = spaceBelow >= 220 || spaceBelow >= spaceAbove;
    const top = openBelow ? rect.bottom + 6 : rect.top - 6;
    const translateY = openBelow ? '0' : '-100%';

    // Keep within viewport horizontally
    let left = rect.left;
    if (left + popupWidth > window.innerWidth - 8) {
      left = window.innerWidth - popupWidth - 8;
    }

    setPopupStyle({ position: 'fixed', top, left, transform: `translateY(${translateY})`, zIndex: 9999 });
  };

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) calcPosition();
      return !v;
    });
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popupRef.current && !popupRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    window.addEventListener('resize', calcPosition);
    window.addEventListener('scroll', calcPosition, true);
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('resize', calcPosition);
      window.removeEventListener('scroll', calcPosition, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        title="Required Zoom OAuth scopes"
        className="inline-flex items-center justify-center h-4 w-4 rounded-full text-blue-500 hover:bg-blue-100 transition-colors"
      >
        <Info size={14} />
      </button>

      {open && (
        <div
          ref={popupRef}
          style={popupStyle}
          className="w-60 rounded-lg border border-blue-200 bg-white shadow-xl ring-1 ring-black/5 p-3 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Required Scopes</p>
            <button type="button" onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={12} />
            </button>
          </div>

          <p className="text-[10px] text-gray-500 mb-2 leading-snug">
            Add these in the{' '}
            <a href="https://marketplace.zoom.us" target="_blank" rel="noreferrer" className="text-blue-600 underline underline-offset-2 hover:text-blue-800">Zoom Marketplace</a>
            {' '}→ App → <span className="font-semibold">Scopes</span> tab.
          </p>

          <div className="space-y-1">
            {REQUIRED_ZOOM_SCOPES.map(({ scope }) => (
              <div key={scope} className="flex items-start gap-1.5 rounded bg-blue-50 p-1.5">
                <Check size={10} className="mt-0.5 shrink-0 text-blue-500" />
                <div className="min-w-0 text-xs leading-tight">
                  <span className="font-mono font-normal text-blue-800 break-all">{scope}</span>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-2 text-[10px] text-gray-400 leading-snug">
            After adding, re-activate the app or wait briefly for changes to propagate.
          </p>
        </div>
      )}
    </>
  );
}

export default ZoomScopesInfoButton;
