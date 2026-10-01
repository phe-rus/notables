import { createContext, type ReactNode, useContext } from "react";

/**
 * Turns a recording into text. Apps provide it where transcription is
 * available (on-device Whisper in the native apps); without a provider,
 * clips simply don't offer to transcribe.
 */
export interface TranscriptionService {
  transcribe(src: string, onProgress: (status: string) => void): Promise<string>;
}

const TranscriptionContext = createContext<TranscriptionService | null>(null);

export function TranscriptionProvider({
  service,
  children,
}: {
  service: TranscriptionService | null;
  children: ReactNode;
}) {
  return <TranscriptionContext.Provider value={service}>{children}</TranscriptionContext.Provider>;
}

export function useTranscriptionService(): TranscriptionService | null {
  return useContext(TranscriptionContext);
}
