'use client';

import React from 'react';

interface SwitchProps {
  isSelected: boolean;
  onChange: (checked: boolean) => void;
  isDisabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function Switch({
  isSelected,
  onChange,
  isDisabled = false,
  className = '',
  children,
}: SwitchProps) {
  return (
    <label
      className={`inline-flex items-center gap-2.5 text-xs select-none ${
        isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={isSelected}
        disabled={isDisabled}
        onClick={(e) => {
          e.preventDefault();
          if (!isDisabled) onChange(!isSelected);
        }}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          isSelected ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isSelected ? 'translate-x-4.5' : 'translate-x-1'
          }`}
        />
      </button>
      {children && <span className="font-medium text-[#3c4043]">{children}</span>}
    </label>
  );
}

// Compound components for backwards-compatibility
Switch.Content = function SwitchContent({ children }: { children?: React.ReactNode }) {
  // If children has text, render text
  return <>{children}</>;
};
Switch.Control = function SwitchControl({ children }: { children?: React.ReactNode }) {
  return null;
};
Switch.Thumb = function SwitchThumb() {
  return null;
};

export default Switch;
