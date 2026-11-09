'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

export interface RowActionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}

interface RowActionsDropdownProps {
  items: RowActionItem[];
  label?: string;
  disabled?: boolean;
  className?: string;
}

export default function RowActionsDropdown({
  items,
  label = 'Actions',
  disabled = false,
  className = '',
}: RowActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [menuCoords, setMenuCoords] = useState<{
    top?: number;
    bottom?: number;
    right: number;
  }>({ right: 0 });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;

    const right = Math.max(8, window.innerWidth - rect.right);
    const top = openUpward ? undefined : rect.bottom + 4;
    const bottom = openUpward ? window.innerHeight - rect.top + 4 : undefined;

    setMenuCoords({ top, bottom, right });
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled || items.length === 0) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || items.length === 0}
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all select-none ${
          disabled || items.length === 0
            ? 'opacity-50 cursor-not-allowed border-[#e8eaed] bg-[#f8f9fa] text-[#9aa0a6]'
            : isOpen
            ? 'border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/20 cursor-pointer shadow-2xs'
            : 'border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8f9fa] hover:border-[#c4c7cc] hover:text-[#202124] shadow-2xs cursor-pointer'
        } ${className}`}
      >
        <span>{label}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-blue-600' : 'text-[#5f6368]'
          }`}
        />
      </button>

      {isOpen &&
        isMounted &&
        items.length > 0 &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: 'fixed',
              top: menuCoords.top !== undefined ? `${menuCoords.top}px` : 'auto',
              bottom: menuCoords.bottom !== undefined ? `${menuCoords.bottom}px` : 'auto',
              right: `${menuCoords.right}px`,
              zIndex: 9999,
            }}
            className="min-w-42.5 py-1 bg-white rounded-xl border border-[#dadce0] shadow-[0_4px_16px_rgba(0,0,0,0.12)] transition-all animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  item.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  item.variant === 'danger'
                    ? 'text-red-600 hover:bg-red-50 hover:text-red-700'
                    : 'text-[#3c4043] hover:bg-[#f8f9fa] hover:text-[#202124]'
                }`}
              >
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
