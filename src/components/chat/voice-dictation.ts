"use client";

import { useEffect, useRef, useState } from "react";

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

interface SpeechRecognitionInstance {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }> & { isFinal: boolean }>;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useVoiceDictation(onTranscript: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const manualStopRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);

  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    setSupported(getSpeechRecognition() !== null);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function createRecognition(Ctor: SpeechRecognitionConstructor) {
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      let finalChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalChunk += res[0].transcript;
        }
      }
      if (finalChunk) {
        onTranscriptRef.current(finalChunk);
      }
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        manualStopRef.current = true;
        releaseStream();
        setListening(false);
      }
    };
    recognition.onend = () => {
      if (manualStopRef.current) {
        releaseStream();
        setListening(false);
        recognitionRef.current = null;
        return;
      }
      // Chrome ends recognition after silence even with continuous=true.
      // We hold the mic open via streamRef so the system indicator stays solid,
      // and start a fresh recognition immediately.
      try {
        const next = createRecognition(Ctor);
        recognitionRef.current = next;
        next.start();
      } catch {
        releaseStream();
        setListening(false);
        recognitionRef.current = null;
      }
    };

    return recognition;
  }

  function releaseStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    const Ctor = getSpeechRecognition();
    if (!Ctor) return;
    manualStopRef.current = false;

    // Hold an independent MediaStream so the macOS mic indicator doesn't flicker
    // between the recognizer's auto-restart cycles.
    try {
      if (!streamRef.current && navigator.mediaDevices?.getUserMedia) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      }
    } catch {
      // If the user denied mic via getUserMedia, recognition will fail next anyway.
      return;
    }

    const recognition = createRecognition(Ctor);
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      releaseStream();
    }
  }

  function stop() {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    releaseStream();
    setListening(false);
  }

  function toggle() {
    if (listening) stop();
    else start();
  }

  return { listening, supported, start, stop, toggle };
}
