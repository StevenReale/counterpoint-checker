import type { KeySignature } from "./types";

const PITCH_CLASS_BY_KEY: Record<KeySignature, number[]> = {
  "C major": [0, 2, 4, 5, 7, 9, 11],
  "G major": [0, 2, 4, 6, 7, 9, 11],
  "D major": [1, 2, 4, 6, 7, 9, 11],
  "A major": [1, 2, 4, 6, 8, 9, 11],
  "E major": [1, 3, 4, 6, 8, 9, 11],
  "F major": [0, 2, 4, 5, 7, 9, 10],
  "Bb major": [0, 2, 3, 5, 7, 9, 10]
};

const NOTE_NAMES = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

export function getScalePitches(key: KeySignature, minMidi = 48, maxMidi = 84): number[] {
  const pitchClasses = new Set(PITCH_CLASS_BY_KEY[key]);
  const result: number[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    if (pitchClasses.has(midi % 12)) {
      result.push(midi);
    }
  }
  return result;
}

export function midiToName(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
