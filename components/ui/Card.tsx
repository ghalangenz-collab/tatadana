import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'interactive';
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  glow = false,
  className = '',
  ...props
}) => {
  const base = 'rounded-2xl border transition-all duration-200';
  const variants = {
    default: 'bg-[#14171D] border-[#262C38]',
    glass: 'bg-[#14171D]/80 backdrop-blur-md border-slate-700/80',
    interactive: 'bg-[#14171D] border-[#262C38] hover:border-slate-400/60 hover:bg-[#181C24] cursor-pointer',
  };

  const glowStyle = glow ? 'ring-1 ring-slate-300/40 shadow-lg shadow-white/5' : '';

  return (
    <div className={`${base} ${variants[variant]} ${glowStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
