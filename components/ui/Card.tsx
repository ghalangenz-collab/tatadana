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
    default: 'bg-[#0A0A0A] border-[#1F2430]',
    glass: 'bg-[#0A0A0A]/95 backdrop-blur-md border-amber-500/20',
    interactive: 'bg-[#0A0A0A] border-[#1F2430] hover:border-amber-500/50 hover:bg-[#0D0F12] cursor-pointer',
  };

  const glowStyle = glow ? 'ring-1 ring-amber-400/40 shadow-lg shadow-amber-500/10' : '';

  return (
    <div className={`${base} ${variants[variant]} ${glowStyle} ${className}`} {...props}>
      {children}
    </div>
  );
};
