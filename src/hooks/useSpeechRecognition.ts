import { useState, useRef, useCallback, useEffect } from 'react';

// Web Speech API interface declarations for TypeScript
interface IWindow extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export type SpeechRecognitionStatus =
  | 'idle'
  | 'requesting_permission'
  | 'listening'
  | 'processing_speech'
  | 'completed'
  | 'error';

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  status: SpeechRecognitionStatus;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: (lang?: string) => Promise<void>;
  stopListening: () => void;
  resetTranscript: () => void;
}

export function useSpeechRecognition(onFinalTranscript?: (text: string) => void): UseSpeechRecognitionReturn {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const onFinalCallbackRef = useRef(onFinalTranscript);
  onFinalCallbackRef.current = onFinalTranscript;

  const hasNativeSpeech = typeof window !== 'undefined' && Boolean(
    (window as unknown as IWindow).SpeechRecognition ||
    (window as unknown as IWindow).webkitSpeechRecognition
  );

  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia
  );

  const isSupported = hasNativeSpeech || hasMediaDevices;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (activeStreamRef.current) {
        activeStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopListening = useCallback(() => {
    setStatus('processing_speech');
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        // ignore
      }
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
  }, []);

  const startListening = useCallback(async (lang = 'en-IN') => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (!isSupported) {
      setError('Voice recognition is not supported in this browser. You can type instructions directly.');
      setStatus('error');
      return;
    }

    setStatus('requesting_permission');

    let stream: MediaStream | null = null;
    if (hasMediaDevices) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        activeStreamRef.current = stream;
      } catch (err: any) {
        console.warn('[WOLI AI] Microphone permission error:', err);
        setStatus('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('Microphone permission was denied. Please allow microphone access in your browser site settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('No microphone found on your device. Please plug in a microphone or type commands.');
        } else {
          setError(`Microphone notice: ${err.message || 'Could not access microphone'}`);
        }
        return;
      }
    }

    // Path A: Native Web Speech API
    if (hasNativeSpeech) {
      try {
        // Stop stream track if not needed by native recognition
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
          activeStreamRef.current = null;
        }

        const SpeechRecognition =
          (window as unknown as IWindow).SpeechRecognition ||
          (window as unknown as IWindow).webkitSpeechRecognition;

        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch (e) {
            // ignore
          }
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;
        recognition.lang = lang; // 'en-IN', 'hi-IN', or 'en-US'

        recognition.onstart = () => {
          setStatus('listening');
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let finalStr = '';
          let interimStr = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalStr += item[0].transcript;
            } else {
              interimStr += item[0].transcript;
            }
          }

          if (finalStr) {
            const cleanFinal = finalStr.trim();
            setTranscript((prev) => (prev ? `${prev} ${cleanFinal}` : cleanFinal));
            if (onFinalCallbackRef.current) {
              onFinalCallbackRef.current(cleanFinal);
            }
          }
          setInterimTranscript(interimStr);
        };

        recognition.onerror = (event: any) => {
          console.warn('[WOLI AI] SpeechRecognition event error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Microphone permission was denied. Please enable microphone permission in your browser address bar.');
            setStatus('error');
          } else if (event.error === 'no-speech') {
            // User stayed quiet, return to idle
            setStatus('idle');
          } else if (event.error === 'network') {
            setError('Speech network service unavailable. Falling back to audio recording.');
            // Will fallback to media recorder next time
            setStatus('error');
          } else {
            setError(`Speech recognition notice: ${event.error}`);
            setStatus('error');
          }
        };

        recognition.onend = () => {
          setInterimTranscript('');
          setStatus((prev) => (prev === 'listening' ? 'completed' : prev));
          setTimeout(() => {
            setStatus((prev) => (prev === 'completed' ? 'idle' : prev));
          }, 1500);
        };

        recognitionRef.current = recognition;
        recognition.start();
        return;
      } catch (err: any) {
        console.warn('[WOLI AI] Native speech recognition init failed, checking MediaRecorder fallback:', err);
      }
    }

    // Path B: MediaRecorder Fallback (records audio and transcribes via server Gemini)
    if (stream && typeof MediaRecorder !== 'undefined') {
      try {
        setStatus('listening');
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
        const recorder = new MediaRecorder(stream, { mimeType });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = async () => {
          setStatus('processing_speech');
          try {
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            if (audioBlob.size < 100) {
              setStatus('idle');
              return;
            }

            // Convert blob to base64
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
              const base64Data = (reader.result as string)?.split(',')[1];
              if (!base64Data) {
                setStatus('idle');
                return;
              }

              const res = await fetch('/api/woli-ai/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType,
                }),
              });

              if (res.ok) {
                const data = await res.json();
                if (data.transcript) {
                  setTranscript(data.transcript);
                  setStatus('completed');
                  if (onFinalCallbackRef.current) {
                    onFinalCallbackRef.current(data.transcript);
                  }
                  setTimeout(() => setStatus('idle'), 1500);
                  return;
                }
              }
              setStatus('idle');
            };
          } catch (recErr: any) {
            console.error('[WOLI AI] Transcription error:', recErr);
            setError('Could not transcribe audio. You can type commands in the chat input.');
            setStatus('error');
          }
        };

        mediaRecorderRef.current = recorder;
        recorder.start(500);
        return;
      } catch (err: any) {
        console.error('[WOLI AI] MediaRecorder error:', err);
        setError('Voice recording failed. Please type your command.');
        setStatus('error');
      }
    }

    setStatus('error');
    setError('Speech recognition could not be started. You can type your command in the input box.');
  }, [hasMediaDevices, hasNativeSpeech, isSupported]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    setStatus('idle');
  }, []);

  return {
    isListening: status === 'listening' || status === 'requesting_permission',
    status,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
  };
}
