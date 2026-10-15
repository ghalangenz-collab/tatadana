import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'green' | 'red' | 'blue' | 'purple' | 'gray' | 'silver' | 'platinum';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'gray',
  size = 'sm',
  className = '',
}) => {
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
  };

  const variants = {
    orange: 'bg-slate-200/15 text-slate-100 border border-slate-300/40',
    silver: 'bg-slate-200/15 text-slate-100 border border-slate-300/40',
    platinum: 'bg-gradient-to-r from-slate-200 to-slate-300 text-slate-950 font-bold border border-white/50 shadow-sm',
    green: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    red: 'bg-rose-500/15 text-rose-400 border border-rose-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    purple: 'bg-purple-500/15 text-purple-400 border border-purple-500/30',
    gray: 'bg-gray-800 text-gray-300 border border-gray-700',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
