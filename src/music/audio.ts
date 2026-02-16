import type { Note } from "./types";
import { midiToFrequency } from "./pitches";

export async function playTwoVoices(
  cantus: Array<Note | null>,
  counterpoint: Array<Note | null>,
  tempo = 72,
  onStep?: (index: number | null) => void
): Promise<void> {
  const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const context = new AudioCtx();
  const beatDuration = 60 / tempo;
  const noteDuration = beatDuration * 0.95;
  const length = Math.max(cantus.length, counterpoint.length);
  const startTime = context.currentTime + 0.05;

  for (let i = 0; i < length; i += 1) {
    const slotTime = startTime + i * beatDuration;
    if (onStep) {
      window.setTimeout(() => onStep(i), Math.max(0, Math.round((slotTime - context.currentTime) * 1000)));
    }
    const cantusNote = cantus[i];
    if (cantusNote) {
      scheduleNote(context, cantusNote, slotTime, noteDuration, "triangle", 0.12);
    }
    const counterpointNote = counterpoint[i];
    if (counterpointNote) {
      scheduleNote(context, counterpointNote, slotTime, noteDuration, "sine", 0.08);
    }
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(() => {
      if (onStep) {
        onStep(null);
      }
      void context.close();
      resolve();
    }, Math.ceil((length * beatDuration + 0.2) * 1000));
  });
}

function scheduleNote(
  context: AudioContext,
  note: Note,
  startTime: number,
  duration: number,
  waveform: OscillatorType,
  gainValue: number
): void {
  const oscillator = context.createOscillator();
  oscillator.type = waveform;
  oscillator.frequency.value = midiToFrequency(note.midi);

  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(gainValue, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.03);
}

export function playPreviewPitch(midi: number, duration = 0.3): void {
  const AudioCtx =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) {
    return;
  }

  const context = new AudioCtx();
  const startTime = context.currentTime + 0.01;
  const note: Note = { midi, rhythm: "whole" };
  scheduleNote(context, note, startTime, duration, "sine", 0.1);

  window.setTimeout(() => {
    void context.close();
  }, Math.ceil((duration + 0.1) * 1000));
}
