"use client";
import { useState, useRef, useCallback } from "react";

export type WordTimestamp = { word: string; start?: number; end?: number };

export type TranscriptResult = {
  transcript: string;
  pauseMap?: number[];
  wordTimestamps?: WordTimestamp[];
  duration?: number;
};

type RecorderFormat = { mimeType: string; extension: string };

const AUTO_STOP_SILENCE_MS = 3000;
const SILENCE_THRESHOLD    = 0.016;
const MIN_RECORD_MS        = 1800;

const RECORDER_FORMAT_PREFERENCES: RecorderFormat[] = [
  { mimeType: "audio/webm;codecs=opus", extension: "webm" },
  { mimeType: "audio/webm", extension: "webm" },
  { mimeType: "audio/mp4", extension: "m4a" },
  { mimeType: "audio/ogg;codecs=opus", extension: "ogg" },
  { mimeType: "audio/ogg", extension: "ogg" },
];

function isProbablyMobileClient(): boolean {
  const ua = navigator.userAgent;
  const hasCoarsePointer = typeof window.matchMedia === "function"
    && window.matchMedia("(pointer: coarse)").matches;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)
    || hasCoarsePointer;
}

function pickRecorderFormat(): RecorderFormat | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const fmt of RECORDER_FORMAT_PREFERENCES) {
    if (MediaRecorder.isTypeSupported(fmt.mimeType)) {
      return fmt;
    }
  }
  return null;
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function readableError(err: unknown, fallback: string): string {
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
      return "Microphone permission is blocked. Please allow microphone access and try again.";
    }
    if (err.name === "NotFoundError") {
      return "No microphone was found on this device.";
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export function useVoiceRecorder(
  onTranscriptReady: (result: TranscriptResult) => void,
) {
  const [isRecording,     setIsRecording]     = useState(false);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [recordSeconds,   setRecordSeconds]   = useState(0);
  const [audioLevel,      setAudioLevel]      = useState(0);
  const [liveTranscript,  setLiveTranscript]  = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);
  const [errorMessage,    setErrorMessage]    = useState<string | null>(null);

  const mediaRecorderRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef      = useRef<Blob[]>([]);
  const audioMimeRef        = useRef<string>("audio/webm");
  const audioContextRef     = useRef<AudioContext | null>(null);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const meterRafRef         = useRef<number | null>(null);
  const timerIntervalRef    = useRef<number | null>(null);
  const silenceStartRef     = useRef<number | null>(null);
  const recordStartRef      = useRef<number>(0);
  const speechRecogRef      = useRef<any>(null);
  const onTranscriptRef     = useRef(onTranscriptReady);
  onTranscriptRef.current   = onTranscriptReady;

  const stopCleanup = useCallback(() => {
    setIsRecording(false);
    setLiveTranscript("");
    setSilenceCountdown(null);
    silenceStartRef.current = null;
    if (timerIntervalRef.current)  { window.clearInterval(timerIntervalRef.current);       timerIntervalRef.current = null; }
    if (meterRafRef.current)       { window.cancelAnimationFrame(meterRafRef.current);     meterRafRef.current = null; }
    if (audioContextRef.current)   { audioContextRef.current.close().catch(() => undefined); audioContextRef.current = null; }
    if (speechRecogRef.current)    {
      try { speechRecogRef.current.stop(); } catch (_) {}
      speechRecogRef.current = null;
    }
    analyserRef.current = null;
    setRecordSeconds(0);
    setAudioLevel(0);
  }, []);
  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopCleanup();
  }, [stopCleanup]);

  const toggle = useCallback(async () => {
    if (isRecording) { stop(); return; }

    try {
      setErrorMessage(null);
      if (typeof MediaRecorder === "undefined") {
        throw new Error("This browser does not support audio recording.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredFormat = pickRecorderFormat();
      const mediaRecorder = preferredFormat
        ? new MediaRecorder(stream, { mimeType: preferredFormat.mimeType })
        : new MediaRecorder(stream);

      audioMimeRef.current = preferredFormat?.mimeType || mediaRecorder.mimeType || "audio/webm";
      audioChunksRef.current = [];
      recordStartRef.current = Date.now();

      const SpeechRec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (SpeechRec && !isProbablyMobileClient()) {
        let finalAcc    = "";
        let shouldRestart = true;

        const startRecog = () => {
          const recog: any = new SpeechRec();
          recog.continuous     = true;
          recog.interimResults = true;
          recog.lang           = "en-US";
          recog.maxAlternatives = 1;

          recog.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) {
                finalAcc += e.results[i][0].transcript + " ";
              } else {
                interim = e.results[i][0].transcript;
              }
            }
            setLiveTranscript((finalAcc + interim).trim());
          };

          recog.onend = () => {
            if (shouldRestart) {
              try { recog.start(); } catch (_) {}
            }
          };

          recog.onerror = (e: any) => {
            if (e.error === "no-speech" || e.error === "aborted") return;
            shouldRestart = false;
          };
          try { recog.start(); } catch (_) {}
          speechRecogRef.current = { stop: () => { shouldRestart = false; try { recog.stop(); } catch (_) {} } };
        };

        startRecog();
      }

      const audioContext = new AudioContext();
      const source       = audioContext.createMediaStreamSource(stream);
      const analyser     = audioContext.createAnalyser();
      analyser.fftSize   = 2048;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current     = analyser;

      const updateMeter = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128 - 1;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 1.5);
        setAudioLevel(level);

        const elapsed = Date.now() - recordStartRef.current;
        if (elapsed > MIN_RECORD_MS) {
          if (level < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            const silenceMs  = Date.now() - silenceStartRef.current;
            const remaining  = Math.max(0, AUTO_STOP_SILENCE_MS - silenceMs);
            setSilenceCountdown(Math.ceil(remaining / 1000));

            if (silenceMs >= AUTO_STOP_SILENCE_MS) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
              }
              stopCleanup();
              return;
            }
          } else {
            silenceStartRef.current = null;
            setSilenceCountdown(null);
          }
        }

        meterRafRef.current = window.requestAnimationFrame(updateMeter);
      };
      meterRafRef.current = window.requestAnimationFrame(updateMeter);
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          if (audioChunksRef.current.length === 0) {
            throw new Error("No audio was captured. Please try again.");
          }

          const mimeType = audioMimeRef.current || "audio/webm";
          const extension = extensionFromMimeType(mimeType);
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          const formData  = new FormData();
          formData.append("audio", audioBlob, `recording.${extension}`);
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          if (!res.ok) {
            let detail = "Transcription failed. Please try again.";
            try {
              const body = await res.json();
              if (typeof body?.error === "string" && body.error.trim()) {
                detail = body.error;
              }
            } catch {
              const txt = await res.text();
              if (txt.trim()) detail = txt.trim();
            }
            throw new Error(detail);
          }

          const payload = await res.json() as TranscriptResult;
          if (!payload.transcript?.trim()) {
            throw new Error("No speech detected. Please speak clearly and try again.");
          }

          onTranscriptRef.current(payload);
        } catch (err) {
          setErrorMessage(readableError(err, "Failed to process recorded audio."));
          console.error("Audio send error:", err);
        } finally {
          setIsTranscribing(false);
          stopCleanup();
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      timerIntervalRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      setErrorMessage(readableError(err, "Microphone access failed."));
      console.error("Microphone access denied:", err);
    }
  }, [isRecording, stop, stopCleanup]);

  return {
    isRecording, isTranscribing, recordSeconds, audioLevel,
    liveTranscript, silenceCountdown, errorMessage,
    toggle, stop,
  };
}
