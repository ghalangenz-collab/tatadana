'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidths[maxWidth]} bg-[#14171D] border border-[#262C38] rounded-2xl p-4 sm:p-6 shadow-2xl z-10 overflow-hidden text-left animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-[#262C38] shrink-0">
          <div className="pr-2">
            <h3 className="text-base sm:text-lg font-bold text-white leading-snug">{title}</h3>
            {subtitle && <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 sm:mt-4 overflow-y-auto max-h-[calc(90vh-100px)] pr-1">{children}</div>
      </div>
    </div>
  );
};
