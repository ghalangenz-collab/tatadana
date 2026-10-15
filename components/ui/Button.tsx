import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-300/40 disabled:opacity-50 disabled:cursor-not-allowed';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3.5 text-base gap-2.5 font-semibold',
  };

  const variants = {
    primary: 'bg-gradient-to-r from-[#FFFFFF] via-[#E2E8F0] to-[#CBD5E1] hover:from-[#F8FAFC] hover:via-[#F1F5F9] hover:to-[#E2E8F0] text-[#0F172A] font-bold shadow-lg shadow-white/10 border border-white/60 active:scale-[0.98]',
    secondary: 'bg-[#1E232D] hover:bg-[#2A313E] text-white border border-[#2D3545] active:scale-[0.98]',
    outline: 'border border-slate-400/60 text-slate-200 hover:bg-slate-200/10 active:scale-[0.98]',
    ghost: 'text-[#9CA3AF] hover:text-white hover:bg-white/5 active:scale-[0.98]',
    danger: 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 active:scale-[0.98]',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
