import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, verifyOTP } from '@/lib/otp/service';
import { demoStore } from '@/lib/store/demo-store';

export async function POST(req: NextRequest) {
  try {
    const { action, phone, code, fullName } = await req.json();

    if (action === 'send') {
      if (!phone) {
        return NextResponse.json({ ok: false, error: 'Nomor WhatsApp / HP wajib diisi.' }, { status: 400 });
      }
      const otpResult = generateOTP(phone);
      return NextResponse.json({
        ok: true,
        devCode: otpResult.devCode, // For dev/mock display
        message: otpResult.message,
      });
    }

    if (action === 'verify') {
      if (!phone || !code) {
        return NextResponse.json({ ok: false, error: 'Nomor HP dan kode OTP wajib diisi.' }, { status: 400 });
      }

      const result = verifyOTP(phone, code);
      if (!result.valid) {
        return NextResponse.json({ ok: false, error: result.message }, { status: 400 });
      }

      // Update or create profile session
      const profile = demoStore.getProfile();
      demoStore.updateProfile({
        phone,
        full_name: fullName || profile.full_name,
      });

      return NextResponse.json({
        ok: true,
        message: 'Verifikasi nomor HP berhasil!',
        profile: demoStore.getProfile(),
      });
    }

    return NextResponse.json({ ok: false, error: 'Aksi tidak dikenal.' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
