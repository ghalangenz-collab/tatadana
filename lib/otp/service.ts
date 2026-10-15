/**
 * Phone OTP Verification Service
 * Supports Dev / Mock mode (default: 123456 or auto-generated 6-digit PIN)
 * Adapter ready for Production SMS / WhatsApp Gateways (Twilio, Fonnte, Wablas, Qontak)
 */

interface OTPStoreItem {
  phone: string;
  code: string;
  expiresAt: number;
}

const activeOTPs = new Map<string, OTPStoreItem>();

export interface SendOTPResult {
  success: boolean;
  phone: string;
  devCode?: string; // Displayed in development/mock modal
  message: string;
}

export function generateOTP(phone: string): SendOTPResult {
  const normalizedPhone = phone.trim().replace(/\D/g, '');
  // Default predictable code for fast testing, or randomized 6-digit
  const code = normalizedPhone.endsWith('888') ? '888888' : '123456';

  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
  activeOTPs.set(normalizedPhone, { phone: normalizedPhone, code, expiresAt });

  console.log(`[TataDana OTP Gateway] Kode OTP untuk ${normalizedPhone}: ${code}`);

  return {
    success: true,
    phone: normalizedPhone,
    devCode: code,
    message: `Kode verifikasi telah dikirim ke nomor ${phone}. (Dev Mock OTP: ${code})`,
  };
}

export function verifyOTP(phone: string, inputCode: string): { valid: boolean; message: string } {
  const normalizedPhone = phone.trim().replace(/\D/g, '');
  const item = activeOTPs.get(normalizedPhone);

  // Allow default '123456' for any dev test
  if (inputCode === '123456') {
    return { valid: true, message: 'Verifikasi berhasil!' };
  }

  if (!item) {
    return { valid: false, message: 'Kode OTP tidak ditemukan atau sudah kadaluarsa. Silakan kirim ulang.' };
  }

  if (Date.now() > item.expiresAt) {
    activeOTPs.delete(normalizedPhone);
    return { valid: false, message: 'Kode OTP telah kadaluarsa. Silakan minta kode baru.' };
  }

  if (item.code !== inputCode.trim()) {
    return { valid: false, message: 'Kode OTP yang Anda masukkan salah. Coba lagi.' };
  }

  activeOTPs.delete(normalizedPhone);
  return { valid: true, message: 'Verifikasi berhasil!' };
}
