'use client';

import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Smartphone, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';

interface PhoneOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  devCode?: string;
  onSuccess: () => void;
}

export const PhoneOTPModal: React.FC<PhoneOTPModalProps> = ({
  isOpen,
  onClose,
  phone,
  devCode = '123456',
  onSuccess,
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (val: string, index: number) => {
    if (val.length > 1) {
      // Handle paste
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otp];
      digits.forEach((d, idx) => {
        newOtp[idx] = d;
      });
      setOtp(newOtp);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-input-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 6) {
      setError('Masukkan 6 digit kode OTP lengkap.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/auth/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          phone,
          code,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        setError(data.error || 'Kode OTP tidak valid.');
        return;
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Gagal memverifikasi OTP.');
    } finally {
      setIsVerifying(false);
    }
  };

  const fillDevCode = () => {
    const digits = devCode.split('').slice(0, 6);
    setOtp(digits);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Verifikasi Nomor WhatsApp"
      subtitle={`Kode 6-digit dikirim ke nomor ${phone}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Mock Dev Notification Banner */}
        <div className="p-3 bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#FF6B00] shrink-0" />
            <div>
              <p className="text-xs font-semibold text-white">Dev / Sandbox Mode</p>
              <p className="text-[11px] text-gray-300">
                Kode OTP Mock: <span className="font-mono font-bold text-[#FF8533]">{devCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={fillDevCode}
            className="flex items-center gap-1 text-xs bg-[#FF6B00]/20 hover:bg-[#FF6B00]/30 text-[#FF8533] px-2.5 py-1 rounded-lg border border-[#FF6B00]/30 transition-colors font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin' : 'Pakai Otomatis'}</span>
          </button>
        </div>

        {/* 6 Digit Inputs */}
        <div className="flex justify-between gap-2">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              id={`otp-input-${idx}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(e.target.value, idx)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className="w-12 h-14 text-center text-xl font-bold bg-[#181C24] border border-[#262C38] focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] rounded-xl text-white outline-none transition-all"
            />
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="text-center">
          <p className="text-xs text-gray-400">
            Tidak menerima kode?{' '}
            <button
              type="button"
              onClick={fillDevCode}
              className="text-[#FF6B00] hover:underline font-semibold"
            >
              Kirim ulang OTP
            </button>
          </p>
        </div>

        <Button
          onClick={handleVerify}
          isLoading={isVerifying}
          className="w-full"
          size="lg"
        >
          Verifikasi & Masuk
        </Button>
      </div>
    </Modal>
  );
};
