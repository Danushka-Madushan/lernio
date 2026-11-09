'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'flat' | 'solid';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isPending?: boolean;
  isIconOnly?: boolean;
  fullWidth?: boolean;
  onPress?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode | ((props: { isPending: boolean }) => React.ReactNode);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isDisabled = false,
      isPending = false,
      isIconOnly = false,
      fullWidth = false,
      onPress,
      onClick,
      disabled,
      className = '',
      children,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const isActuallyDisabled = Boolean(disabled || isDisabled || isPending);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isActuallyDisabled) {
        e.preventDefault();
        return;
      }
      if (onPress) onPress(e);
      if (onClick) onClick(e);
    };

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs border border-transparent',
      solid: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-xs border border-transparent',
      outline:
        'border border-[#dadce0] bg-white text-[#3c4043] hover:bg-[#f8f9fa] hover:border-[#c4c7cc] hover:text-[#202124] shadow-2xs',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs border border-transparent',
      secondary: 'bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] active:bg-[#dadce0] border border-transparent',
      flat: 'bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed] active:bg-[#dadce0] border border-transparent',
      ghost: 'text-[#5f6368] hover:bg-[#f8f9fa] hover:text-[#202124] border border-transparent',
    }[variant] || 'bg-blue-600 text-white hover:bg-blue-700';

    const sizeClasses = isIconOnly
      ? {
          xs: 'p-1 rounded-md',
          sm: 'p-1.5 rounded-lg',
          md: 'p-2 rounded-lg',
          lg: 'p-2.5 rounded-xl',
        }[size]
      : {
          xs: 'px-2.5 py-1 text-xs rounded-md gap-1',
          sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
          md: 'px-4 py-2 text-sm rounded-lg gap-2',
          lg: 'px-5 py-2.5 text-base rounded-xl gap-2',
        }[size];

    const content = typeof children === 'function' ? children({ isPending }) : children;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isActuallyDisabled}
        onClick={handleClick}
        className={`inline-flex items-center justify-center font-medium transition-all select-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${
          fullWidth ? 'w-full' : ''
        } ${variantClasses} ${sizeClasses} ${className}`}
        {...props}
      >
        {isPending && typeof children !== 'function' && (
          <Loader2 size={size === 'lg' ? 18 : 14} className="animate-spin shrink-0" />
        )}
        {content}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
