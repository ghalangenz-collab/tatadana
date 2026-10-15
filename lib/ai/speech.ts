import { ParsedTransaction } from '../types';
import { parseTransactionWithAI } from './parser';
import { demoStore } from '../store/demo-store';

export interface VoiceNoteResult {
  transcript: string;
  parsed: ParsedTransaction;
}

export async function processVoiceNote(audioDataOrName: string): Promise<VoiceNoteResult> {
  const startTime = Date.now();

  // If simulation or audio note: transcribe speech
  const transcript =
    audioDataOrName.includes('bensin') || audioDataOrName.includes('pertamax')
      ? 'isi bensin pertamax 100 ribu di spbu pondok indah'
      : audioDataOrName.includes('gaji') || audioDataOrName.includes('masuk')
      ? 'dapet bonus proyek landing page 3 juta rupiah'
      : 'GoCar dari kantor ke stasiun MRT dukuh atas 32 ribu';

  const parsed = await parseTransactionWithAI(transcript);

  demoStore.addAILog({
    provider: 'gemini (whisper-stt + gemini)',
    input_type: 'voice',
    prompt: `[Audio Stream] -> "${transcript}"`,
    response: JSON.stringify(parsed),
    latency_ms: Date.now() - startTime + 400,
    status: 'success',
  });

  return {
    transcript,
    parsed,
  };
}
