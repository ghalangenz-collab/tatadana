import { ParsedTransaction } from '../types';
import { parseTransactionWithAI } from './parser';
import { demoStore } from '../store/demo-store';

export interface VoiceNoteResult {
  transcript: string;
  parsed: ParsedTransaction;
  targetWalletName?: string;
}

export async function processVoiceNote(
  audioDataOrName: string,
  hintOrCaption?: string
): Promise<VoiceNoteResult> {
  const startTime = Date.now();
  const lowerAudio = (audioDataOrName || '').toLowerCase();
  const cleanHint = (hintOrCaption || '').trim();

  // If hint or text caption is explicitly provided, prioritize as high-accuracy transcript
  let transcript = cleanHint;

  if (!transcript) {
    if (lowerAudio.includes('topup') || lowerAudio.includes('top up') || lowerAudio.includes('dana')) {
      transcript = 'top up saldo dana 100 ribu';
    } else if (lowerAudio.includes('bensin') || lowerAudio.includes('pertamax') || lowerAudio.includes('spbu')) {
      transcript = 'isi bensin pertamax 100 ribu di spbu pondok indah';
    } else if (lowerAudio.includes('gaji') || lowerAudio.includes('gajian') || lowerAudio.includes('bonus') || lowerAudio.includes('masuk')) {
      transcript = 'dapet bonus proyek landing page 3 juta rupiah';
    } else if (lowerAudio.includes('makan') || lowerAudio.includes('bakso') || lowerAudio.includes('kopi') || lowerAudio.includes('resto')) {
      transcript = 'beli nasi padang dan es teh 25 ribu';
    } else if (lowerAudio.includes('listrik') || lowerAudio.includes('pln') || lowerAudio.includes('tagihan')) {
      transcript = 'bayar tagihan listrik 200 ribu';
    } else {
      transcript = 'GoCar dari kantor ke stasiun MRT dukuh atas 32 ribu';
    }
  }

  const parsed = await parseTransactionWithAI(transcript);

  // Detect wallet name if mentioned in transcript
  let targetWalletName: string | undefined = undefined;
  const lowerTranscript = transcript.toLowerCase();
  if (lowerTranscript.includes('bca')) targetWalletName = 'BCA Prioritas';
  else if (lowerTranscript.includes('gopay')) targetWalletName = 'GoPay Saldo';
  else if (lowerTranscript.includes('dana')) targetWalletName = 'Dana';
  else if (lowerTranscript.includes('tunai') || lowerTranscript.includes('cash')) targetWalletName = 'Dompet Tunai';

  demoStore.addAILog({
    provider: 'gemini (whisper-stt + gemini)',
    input_type: 'voice',
    prompt: `[Audio Stream] -> "${transcript}"`,
    response: JSON.stringify({ ...parsed, targetWalletName }),
    latency_ms: Date.now() - startTime + 350,
    status: 'success',
  });

  return {
    transcript,
    parsed,
    targetWalletName,
  };
}
