import { useEffect, useMemo, useRef, useState } from "react";
import { playPreviewPitch, playTwoVoices } from "./music/audio";
import { midiToName } from "./music/pitches";
import { lintFirstSpecies } from "./music/rules/engine";
import type { KeySignature, Note } from "./music/types";
import { BarlineType, Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice as VexVoice } from "vexflow";

type ToolMode = "whole" | "delete";
type Voice = "upper" | "lower";
type StaffNote = Note | null;

const DEFAULT_MEASURE_COUNT = 8;
const MEASURE_COUNT_OPTIONS = [8, 9, 10, 11, 12, 13] as const;
const WHOLE_NOTE: Note["rhythm"] = "whole";
const KEY_SIGNATURES: KeySignature[] = [
  "C major",
  "G major",
  "D major",
  "A major",
  "E major",
  "F major",
  "Bb major"
];

const SCALE_BY_KEY: Record<KeySignature, number[]> = {
  "C major": [0, 2, 4, 5, 7, 9, 11],
  "G major": [0, 2, 4, 6, 7, 9, 11],
  "D major": [1, 2, 4, 6, 7, 9, 11],
  "A major": [1, 2, 4, 6, 8, 9, 11],
  "E major": [1, 3, 4, 6, 8, 9, 11],
  "F major": [0, 2, 4, 5, 7, 9, 10],
  "Bb major": [0, 2, 3, 5, 7, 9, 10]
};

const STAFF = {
  width: 980,
  height: 360,
  left: 96,
  right: 40,
  topUpper: 70,
  topLower: 215,
  lineSpacing: 12
};

const UPPER_REFERENCE = 64; // E4, bottom line treble
const LOWER_REFERENCE = 43; // G2, bottom line bass

export default function App(): JSX.Element {
  const [keySignature, setKeySignature] = useState<KeySignature>("C major");
  const [measureCount, setMeasureCount] = useState<number>(DEFAULT_MEASURE_COUNT);
  const [tool, setTool] = useState<ToolMode>("whole");
  const [cantusStaff, setCantusStaff] = useState<Voice>("lower");
  const [upper, setUpper] = useState<StaffNote[]>(emptyStaff(DEFAULT_MEASURE_COUNT));
  const [lower, setLower] = useState<StaffNote[]>(emptyStaff(DEFAULT_MEASURE_COUNT));
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSweepIndex, setActiveSweepIndex] = useState<number | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const keyScale = useMemo(() => buildKeyMidiScale(keySignature), [keySignature]);
  const upperRefIndex = useMemo(() => nearestScaleIndex(keyScale, UPPER_REFERENCE), [keyScale]);
  const lowerRefIndex = useMemo(() => nearestScaleIndex(keyScale, LOWER_REFERENCE), [keyScale]);

  const lintMessages = useMemo(() => {
    const cantusLine = cantusStaff === "lower" ? lower : upper;
    const counterpointLine = cantusStaff === "lower" ? upper : lower;
    const cantus: Note[] = [];
    const counterpoint: Note[] = [];
    for (let i = 0; i < measureCount; i += 1) {
      const cantusNote = cantusLine[i];
      const counterpointNote = counterpointLine[i];
      if (cantusNote && counterpointNote) {
        cantus.push(cantusNote);
        counterpoint.push(counterpointNote);
      }
    }
    if (cantus.length === 0) {
      return [
        {
          ruleId: "empty",
          severity: "warning" as const,
          message: "Add notes to both staves to run first-species linting."
        }
      ];
    }
    const messages = lintFirstSpecies(
      cantus,
      counterpoint,
      keySignature,
      undefined,
      cantusStaff === "upper"
    );
    if (cantus.length < measureCount) {
      messages.unshift({
        ruleId: "incomplete",
        severity: "warning" as const,
        message: "Some measures contain rests; linting currently evaluates only fully-notated note pairs."
      });
    }
    return messages;
  }, [cantusStaff, keySignature, lower, measureCount, upper]);

  async function handlePlayback(): Promise<void> {
    const cantusLine = cantusStaff === "lower" ? lower : upper;
    const counterpointLine = cantusStaff === "lower" ? upper : lower;
    const hasAnyNote = [...upper, ...lower].some((note) => note !== null);
    if (!hasAnyNote) {
      setPlaybackError("Add at least one note before playback.");
      return;
    }
    setIsPlaying(true);
    setPlaybackError(null);
    try {
      await playTwoVoices(cantusLine, counterpointLine, 72, setActiveSweepIndex);
    } catch (error) {
      setPlaybackError((error as Error).message);
    } finally {
      setActiveSweepIndex(null);
      setIsPlaying(false);
    }
  }

  function updateVoice(voice: Voice, slot: number, value: StaffNote): void {
    if (voice === "upper") {
      const next = [...upper];
      next[slot] = value;
      setUpper(next);
      return;
    }
    const next = [...lower];
    next[slot] = value;
    setLower(next);
  }

  function handleMeasureCountChange(nextMeasureCount: number): void {
    setMeasureCount(nextMeasureCount);
    setUpper((current) => resizeStaff(current, nextMeasureCount));
    setLower((current) => resizeStaff(current, nextMeasureCount));
  }

  function resetStaves(): void {
    setUpper(emptyStaff(measureCount));
    setLower(emptyStaff(measureCount));
    setActiveSweepIndex(null);
    setPlaybackError(null);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Counterpoint Checker</h1>
        <p>First species writing workspace with a grand staff and configurable rule linting.</p>
      </header>

      <section className="control-row">
        <label>
          Key Signature
          <select
            value={keySignature}
            onChange={(event) => setKeySignature(event.target.value as KeySignature)}
          >
            {KEY_SIGNATURES.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label>
          Measures
          <select
            value={measureCount}
            onChange={(event) => handleMeasureCountChange(Number(event.target.value))}
          >
            {MEASURE_COUNT_OPTIONS.map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cantus Firmus Staff
          <select value={cantusStaff} onChange={(event) => setCantusStaff(event.target.value as Voice)}>
            <option value="lower">Lower staff (bass)</option>
            <option value="upper">Upper staff (treble)</option>
          </select>
        </label>

        <div className="tool-palette" role="group" aria-label="Notation tools">
          <span className="tool-title">Tools</span>
          <button
            type="button"
            className={tool === "whole" ? "tool-btn active" : "tool-btn"}
            onClick={() => setTool("whole")}
          >
            Whole note
          </button>
          <button
            type="button"
            className={tool === "delete" ? "tool-btn active" : "tool-btn"}
            onClick={() => setTool("delete")}
          >
            Delete
          </button>
        </div>

        <button type="button" onClick={() => void handlePlayback()} disabled={isPlaying}>
          {isPlaying ? "Playing..." : "Play Both Voices"}
        </button>
        <button type="button" onClick={resetStaves} disabled={isPlaying}>
          Reset Staves
        </button>
      </section>

      {playbackError ? <p className="error-banner">Audio error: {playbackError}</p> : null}

      <section className="score-panel">
        <h2>Grand Staff</h2>
        <p className="score-help">
          Click lines or spaces to place notes when the Whole note tool is active. Use Delete to restore a whole
          rest.
        </p>
        <GrandStaff
          tool={tool}
          keySignature={keySignature}
          measureCount={measureCount}
          upper={upper}
          lower={lower}
          keyScale={keyScale}
          upperRefIndex={upperRefIndex}
          lowerRefIndex={lowerRefIndex}
          activeSweepIndex={activeSweepIndex}
          onSetNote={(voice, slot, note) => {
            updateVoice(voice, slot, note);
            if (note) {
              playPreviewPitch(note.midi);
            }
          }}
        />
      </section>

      <section className="analysis-panel">
        <h2>Lint Findings</h2>
        {lintMessages.length === 0 ? (
          <p className="ok-msg">No rule violations detected for enabled first-species rules.</p>
        ) : (
          <ul>
            {lintMessages.map((issue, index) => (
              <li key={`${issue.ruleId}-${issue.index ?? "none"}-${index}`}>
                <strong>{issue.severity.toUpperCase()}</strong> [{issue.ruleId}]
                {typeof issue.index === "number" ? ` note ${issue.index + 1}: ` : ": "}
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function GrandStaff(props: {
  tool: ToolMode;
  keySignature: KeySignature;
  measureCount: number;
  upper: StaffNote[];
  lower: StaffNote[];
  keyScale: number[];
  upperRefIndex: number;
  lowerRefIndex: number;
  activeSweepIndex: number | null;
  onSetNote: (voice: Voice, slot: number, note: StaffNote) => void;
}): JSX.Element {
  const {
    tool,
    keySignature,
    measureCount,
    upper,
    lower,
    keyScale,
    upperRefIndex,
    lowerRefIndex,
    activeSweepIndex,
    onSetNote
  } = props;
  const [layout, setLayout] = useState({
    slotBoundaries: Array.from({ length: measureCount + 1 }, (_, i) => 220 + i * 80),
    upperTopY: STAFF.topUpper,
    upperBottomY: STAFF.topUpper + STAFF.lineSpacing * 4,
    lowerTopY: STAFF.topLower,
    lowerBottomY: STAFF.topLower + STAFF.lineSpacing * 4,
    stepPixels: STAFF.lineSpacing / 2
  });
  const vexRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = vexRef.current;
    if (!host) {
      return;
    }
    host.innerHTML = "";

    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(STAFF.width, STAFF.height);
    const context = renderer.getContext();
    const staveWidth = STAFF.width - STAFF.left - STAFF.right;

    const treble = new Stave(STAFF.left, STAFF.topUpper, staveWidth);
    treble.addClef("treble").addKeySignature(toVexKeySignature(keySignature));
    treble.setBegBarType(BarlineType.SINGLE);
    treble.setEndBarType(BarlineType.SINGLE);
    treble.setContext(context).draw();

    const bass = new Stave(STAFF.left, STAFF.topLower, staveWidth);
    bass.addClef("bass").addKeySignature(toVexKeySignature(keySignature));
    bass.setBegBarType(BarlineType.SINGLE);
    bass.setEndBarType(BarlineType.SINGLE);
    bass.setContext(context).draw();

    new StaveConnector(treble, bass).setType("brace").setContext(context).draw();
    new StaveConnector(treble, bass).setType("singleLeft").setContext(context).draw();

    const upperNotes = toVexNotes(upper, "upper", keyScale, upperRefIndex);
    const lowerNotes = toVexNotes(lower, "lower", keyScale, lowerRefIndex);
    drawVoice(upperNotes, treble, measureCount, context);
    drawVoice(lowerNotes, bass, measureCount, context);

    const slotBoundaries = computeSlotBoundaries(
      upperNotes.map((note) => note.getAbsoluteX()),
      Math.max(treble.getNoteStartX(), bass.getNoteStartX()),
      Math.min(treble.getNoteEndX(), bass.getNoteEndX())
    );
    const svg = host.querySelector("svg");
    if (svg) {
      drawEngravedMeasureLines(svg, slotBoundaries, treble.getYForLine(0), treble.getYForLine(4));
      drawEngravedMeasureLines(svg, slotBoundaries, bass.getYForLine(0), bass.getYForLine(4));
    }

    setLayout((current) => ({
      ...current,
      slotBoundaries,
      upperTopY: treble.getYForLine(0),
      upperBottomY: treble.getYForLine(4),
      lowerTopY: bass.getYForLine(0),
      lowerBottomY: bass.getYForLine(4),
      stepPixels: treble.getSpacingBetweenLines() / 2
    }));
  }, [keySignature, measureCount, upper, lower, keyScale, upperRefIndex, lowerRefIndex]);

  function placeFromClick(voice: Voice, slot: number, clickY: number): void {
    if (tool === "delete") {
      onSetNote(voice, slot, null);
      return;
    }
    const bottom = voice === "upper" ? layout.upperBottomY : layout.lowerBottomY;
    const reference = voice === "upper" ? upperRefIndex : lowerRefIndex;
    const stepOffset = Math.round((bottom - clickY) / layout.stepPixels);
    const index = clamp(reference + stepOffset, 0, keyScale.length - 1);
    onSetNote(voice, slot, { midi: keyScale[index], rhythm: WHOLE_NOTE });
  }

  return (
    <div className="score-stack">
      <div ref={vexRef} className="vex-layer" aria-hidden="true" />
      <svg viewBox={`0 0 ${STAFF.width} ${STAFF.height}`} role="img" aria-label="Grand staff">
        {renderHitboxes(
          "upper",
          upper,
          layout.slotBoundaries,
          layout.upperTopY,
          layout.upperBottomY,
          activeSweepIndex,
          placeFromClick
        )}
        {renderHitboxes(
          "lower",
          lower,
          layout.slotBoundaries,
          layout.lowerTopY,
          layout.lowerBottomY,
          activeSweepIndex,
          placeFromClick
        )}
      </svg>
    </div>
  );
}

function renderHitboxes(
  voice: Voice,
  notes: StaffNote[],
  slotBoundaries: number[],
  topY: number,
  bottomY: number,
  activeSweepIndex: number | null,
  onClick: (voice: Voice, slot: number, clickY: number) => void
): JSX.Element {
  const zoneY = topY - STAFF.lineSpacing * 3;
  const zoneHeight = bottomY - topY + STAFF.lineSpacing * 6;
  const cursorClass = "note-hitbox";

  return (
    <g>
      {notes.map((note, i) => {
        const x0 = slotBoundaries[i];
        const slotWidth = Math.max(8, slotBoundaries[i + 1] - slotBoundaries[i]);
        return (
          <g key={`${voice}-${i}`}>
            {activeSweepIndex === i ? (
              <rect
                x={x0}
                y={topY - 3}
                width={slotWidth}
                height={bottomY - topY + 6}
                className="sweep-highlight"
              />
            ) : null}
            <rect
              x={x0}
              y={zoneY}
              width={slotWidth}
              height={zoneHeight}
              className={cursorClass}
              onClick={(event) => {
                const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
                if (!rect) {
                  return;
                }
                const normalizedY = ((event.clientY - rect.top) / rect.height) * STAFF.height;
                onClick(voice, i, normalizedY);
              }}
            />
          </g>
        );
      })}
    </g>
  );
}

function computeSlotBoundaries(noteCenters: number[], startX: number, endX: number): number[] {
  if (noteCenters.length === 0) {
    return [startX, endX];
  }
  const boundaries: number[] = [startX];
  for (let i = 1; i < noteCenters.length; i += 1) {
    boundaries.push((noteCenters[i - 1] + noteCenters[i]) / 2);
  }
  boundaries.push(endX);
  return boundaries;
}

function drawEngravedMeasureLines(svg: Element, boundaries: number[], topY: number, bottomY: number): void {
  const ns = "http://www.w3.org/2000/svg";
  for (let i = 1; i < boundaries.length - 1; i += 1) {
    const line = document.createElementNS(ns, "line");
    line.setAttribute("x1", String(boundaries[i]));
    line.setAttribute("y1", String(topY));
    line.setAttribute("x2", String(boundaries[i]));
    line.setAttribute("y2", String(bottomY));
    line.setAttribute("class", "vf-measure-line");
    svg.appendChild(line);
  }
}

function drawVoice(notes: StaveNote[], stave: Stave, measureCount: number, context: ReturnType<Renderer["getContext"]>): void {
  const voice = new VexVoice({ numBeats: measureCount, beatValue: 1 });
  voice.addTickables(notes);
  new Formatter().joinVoices([voice]).formatToStave([voice], stave);
  voice.draw(context, stave);
}

function toVexNotes(
  notes: StaffNote[],
  voice: Voice,
  scale: number[],
  referenceIndex: number
): StaveNote[] {
  const clef = voice === "upper" ? "treble" : "bass";
  const restKey = voice === "upper" ? "b/4" : "d/3";
  return notes.map((note) => {
    if (!note) {
      return new StaveNote({ clef, keys: [restKey], duration: "wr" });
    }
    const key = midiToDiatonicVexKey(note.midi, scale, referenceIndex, voice);
    return new StaveNote({ clef, keys: [key], duration: "w" });
  });
}

function midiToDiatonicVexKey(
  midi: number,
  scale: number[],
  referenceIndex: number,
  voice: Voice
): string {
  const referenceLetter = voice === "upper" ? "E" : "G";
  const referenceOctave = voice === "upper" ? 4 : 2;
  const letters = ["C", "D", "E", "F", "G", "A", "B"];
  const refLetterIndex = letters.indexOf(referenceLetter);
  const scaleIndex = nearestScaleIndex(scale, midi);
  const stepOffset = scaleIndex - referenceIndex;
  const absolute = refLetterIndex + stepOffset;
  const wrappedIndex = ((absolute % 7) + 7) % 7;
  const octave = referenceOctave + Math.floor(absolute / 7);
  return `${letters[wrappedIndex].toLowerCase()}/${octave}`;
}

function buildKeyMidiScale(key: KeySignature, minMidi = 36, maxMidi = 90): number[] {
  const pcs = new Set(SCALE_BY_KEY[key]);
  const scale: number[] = [];
  for (let midi = minMidi; midi <= maxMidi; midi += 1) {
    if (pcs.has(midi % 12)) {
      scale.push(midi);
    }
  }
  return scale;
}

function toVexKeySignature(key: KeySignature): string {
  switch (key) {
    case "C major":
      return "C";
    case "G major":
      return "G";
    case "D major":
      return "D";
    case "A major":
      return "A";
    case "E major":
      return "E";
    case "F major":
      return "F";
    case "Bb major":
      return "Bb";
  }
}

function nearestScaleIndex(scale: number[], midi: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let i = 0; i < scale.length; i += 1) {
    const distance = Math.abs(scale[i] - midi);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }
  return bestIndex;
}

function emptyStaff(length: number): StaffNote[] {
  return Array.from({ length }, () => null);
}

function resizeStaff(staff: StaffNote[], nextLength: number): StaffNote[] {
  if (staff.length === nextLength) {
    return staff;
  }
  if (staff.length > nextLength) {
    return staff.slice(0, nextLength);
  }
  return [...staff, ...Array.from({ length: nextLength - staff.length }, () => null)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function formatVoiceForDebug(voice: StaffNote[]): string {
  return voice.map((note) => (note ? midiToName(note.midi) : "rest")).join(" | ");
}
