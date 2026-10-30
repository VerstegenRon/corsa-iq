"use client";

// The driver-feedback textarea with a microphone button: the browser's own speech recognition
// writes what the driver says into the field, live. Nothing is recorded or sent anywhere by us; the
// browser handles the audio. Where the browser has no speech recognition (Firefox), only typing.

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/icons";
import { inputClass, labelClass } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/locales";

// The Web Speech API is not in TypeScript's DOM types, so only the parts used here.
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionConstructor = new () => Recognition;

const SPEECH_LANG: Record<Locale, string> = { nl: "nl-NL", en: "en-GB", de: "de-DE", fr: "fr-FR" };

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function FeedbackField({
  name = "driver_feedback",
  label,
  defaultValue,
  rows = 3,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  rows?: number;
}) {
  const locale = useLocale();
  const tf = useT().feedback;
  const errors: Record<string, string> = {
    "not-allowed": tf.micDenied,
    "service-not-allowed": tf.micDenied,
    "no-speech": tf.noSpeech,
    network: tf.network,
    "audio-capture": tf.noMic,
  };
  const fieldId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  // Known only after mount: the server cannot tell which browser it renders for.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser capability, only known on the client
    setSupported(recognitionConstructor() !== null);
    return () => recognitionRef.current?.stop();
  }, []);

  function append(text: string) {
    const textarea = textareaRef.current;
    if (!textarea || !text.trim()) return;
    const current = textarea.value.trimEnd();
    const sentence = text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
    textarea.value = current ? `${current}${/[.!?]$/.test(current) ? "" : "."} ${sentence}` : sentence;
  }

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Constructor = recognitionConstructor();
    if (!Constructor) return;
    const recognition = new Constructor();
    recognition.lang = SPEECH_LANG[locale];
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) append(result[0].transcript);
        else pending += result[0].transcript;
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setError(errors[event.error] ?? tf.speechFailed);
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setError(null);
    recognition.start();
    setListening(true);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-end justify-between gap-3">
        <label htmlFor={fieldId} className={labelClass}>
          {label ?? tf.fieldLabel}
        </label>
        {supported && (
          <button
            type="button"
            onClick={toggle}
            aria-pressed={listening}
            className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
              listening ? "border-brand-400 bg-brand-500 text-on-brand" : "border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
            }`}
          >
            {listening ? (
              <span aria-hidden="true" className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-on-brand opacity-75 motion-reduce:animate-none" />
                <span className="relative inline-flex size-2.5 rounded-full bg-on-brand" />
              </span>
            ) : (
              <Icon name="mic" className="size-4" />
            )}
            {listening ? tf.stop : tf.speak}
          </button>
        )}
      </div>
      <textarea
        ref={textareaRef}
        id={fieldId}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        placeholder={tf.placeholder}
        className={`${inputClass} h-auto py-3`}
      />
      <p aria-live="polite" className="min-h-4 text-xs text-zinc-500">
        {error ? (
          <span className="text-amber-300">▲ {error}</span>
        ) : listening ? (
          interim ? (
            <span className="text-zinc-300 italic">{interim}…</span>
          ) : (
            tf.listening
          )
        ) : supported === false ? (
          tf.unsupported
        ) : (
          tf.hint
        )}
      </p>
    </div>
  );
}
