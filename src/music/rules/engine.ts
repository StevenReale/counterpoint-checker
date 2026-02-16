import type { KeySignature, LintMessage, Note, RuleConfig } from "../types";
import rulesConfig from "./firstSpeciesRules.json";

type RuleEvaluator = (
  cantus: Note[],
  counterpoint: Note[],
  severity: "error" | "warning",
  keySignature: KeySignature,
  cantusIsUpper: boolean
) => LintMessage[];

const PERFECT_INTERVALS = new Set([0, 7]);
const CONSONANT_INTERVALS = new Set([0, 3, 4, 7, 8, 9]);

const TONIC_BY_KEY: Record<KeySignature, number> = {
  "C major": 0,
  "G major": 7,
  "D major": 2,
  "A major": 9,
  "E major": 4,
  "F major": 5,
  "Bb major": 10
};

function intervalMod12(low: number, high: number): number {
  return Math.abs(high - low) % 12;
}

function majorDegreePitchClass(key: KeySignature, degree: 1 | 2 | 7): number {
  const tonic = TONIC_BY_KEY[key];
  if (degree === 1) {
    return tonic;
  }
  if (degree === 2) {
    return (tonic + 2) % 12;
  }
  return (tonic + 11) % 12;
}

function buildIssue(
  ruleId: string,
  severity: "error" | "warning",
  message: string,
  index?: number
): LintMessage {
  return { ruleId, severity, message, index };
}

const RULE_IMPLEMENTATIONS: Record<string, RuleEvaluator> = {
  equalLength: (cantus, counterpoint, severity) => {
    if (cantus.length === counterpoint.length) {
      return [];
    }
    return [
      buildIssue(
        "equalLength",
        severity,
        "Cantus and counterpoint must have the same number of notes."
      )
    ];
  },
  wholeNotesOnly: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    cantus.forEach((note, index) => {
      if (note.rhythm !== "whole") {
        issues.push(
          buildIssue("wholeNotesOnly", severity, "Cantus note is not a whole note.", index)
        );
      }
    });
    counterpoint.forEach((note, index) => {
      if (note.rhythm !== "whole") {
        issues.push(
          buildIssue(
            "wholeNotesOnly",
            severity,
            "Counterpoint note is not a whole note.",
            index
          )
        );
      }
    });
    return issues;
  },
  noVoiceCrossing: (cantus, counterpoint, severity, keySignature, cantusIsUpper) => {
    const issues: LintMessage[] = [];
    const length = Math.min(cantus.length, counterpoint.length);
    for (let i = 0; i < length; i += 1) {
      const lowerMidi = cantusIsUpper ? counterpoint[i].midi : cantus[i].midi;
      const upperMidi = cantusIsUpper ? cantus[i].midi : counterpoint[i].midi;
      if (lowerMidi >= upperMidi) {
        issues.push(
          buildIssue(
            "noVoiceCrossing",
            severity,
            "Voice crossing: lower voice meets or exceeds upper voice.",
            i
          )
        );
      }
    }
    return issues;
  },
  verticalConsonance: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    const length = Math.min(cantus.length, counterpoint.length);
    for (let i = 0; i < length; i += 1) {
      const interval = intervalMod12(cantus[i].midi, counterpoint[i].midi);
      if (!CONSONANT_INTERVALS.has(interval)) {
        issues.push(
          buildIssue(
            "verticalConsonance",
            severity,
            "Dissonant vertical interval found.",
            i
          )
        );
      }
    }
    return issues;
  },
  perfectStartAndEnd: (cantus, counterpoint, severity) => {
    if (cantus.length === 0 || counterpoint.length === 0) {
      return [];
    }
    const issues: LintMessage[] = [];
    const firstInterval = intervalMod12(cantus[0].midi, counterpoint[0].midi);
    if (!PERFECT_INTERVALS.has(firstInterval)) {
      issues.push(
        buildIssue(
          "perfectStartAndEnd",
          severity,
          "First interval must be a perfect consonance (unison, fifth, octave).",
          0
        )
      );
    }
    const lastIndex = Math.min(cantus.length, counterpoint.length) - 1;
    if (lastIndex < 0) {
      return issues;
    }
    const lastInterval = intervalMod12(cantus[lastIndex].midi, counterpoint[lastIndex].midi);
    if (!PERFECT_INTERVALS.has(lastInterval)) {
      issues.push(
        buildIssue(
          "perfectStartAndEnd",
          severity,
          "Last interval must be a perfect consonance (unison, fifth, octave).",
          lastIndex
        )
      );
    }
    return issues;
  },
  noParallelPerfects: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    const length = Math.min(cantus.length, counterpoint.length);
    for (let i = 1; i < length; i += 1) {
      const prevInterval = intervalMod12(cantus[i - 1].midi, counterpoint[i - 1].midi);
      const currentInterval = intervalMod12(cantus[i].midi, counterpoint[i].midi);
      if (!PERFECT_INTERVALS.has(prevInterval) || !PERFECT_INTERVALS.has(currentInterval)) {
        continue;
      }

      const cantusMotion = cantus[i].midi - cantus[i - 1].midi;
      const counterpointMotion = counterpoint[i].midi - counterpoint[i - 1].midi;
      const sameDirection =
        (cantusMotion > 0 && counterpointMotion > 0) ||
        (cantusMotion < 0 && counterpointMotion < 0);

      if (sameDirection) {
        issues.push(
          buildIssue(
            "noParallelPerfects",
            severity,
            "Parallel perfect intervals detected between adjacent notes.",
            i
          )
        );
      }
    }
    return issues;
  },
  noRepeatedNotesCF: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];

    for (let i = 1; i < cantus.length; i += 1) {
      if (cantus[i].midi === cantus[i - 1].midi) {
        issues.push(
          buildIssue(
            "noRepeatedNotesCF",
            severity,
            "Cantus repeats the previous note.",
            i
          )
        );
      }
    }
    return issues;
  },
  oneRepeatedNoteCPT: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    let repeatedPairs = 0;
    for (let i = 1; i < counterpoint.length; i += 1) {
      if (counterpoint[i].midi === counterpoint[i - 1].midi) {
        repeatedPairs += 1;
        if (repeatedPairs > 1) {
          issues.push(
            buildIssue(
              "oneRepeatedNoteCPT",
              severity,
              "Counterpoint has more than one repeated adjacent tone.",
              i
            )
          );
        }
      }
    }
    return issues;
  },
  uniqueClimax: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    const cantusMax = Math.max(...cantus.map((n) => n.midi));
    const cantusMaxCount = cantus.filter((n) => n.midi === cantusMax).length;
    if (cantusMaxCount > 1) {
      issues.push(
        buildIssue("uniqueClimax", severity, "Cantus highest note appears more than once.")
      );
    }

    const counterpointMax = Math.max(...counterpoint.map((n) => n.midi));
    const counterpointMaxCount = counterpoint.filter((n) => n.midi === counterpointMax).length;
    if (counterpointMaxCount > 1) {
      issues.push(
        buildIssue(
          "uniqueClimax",
          severity,
          "Counterpoint highest note appears more than once."
        )
      );
    }
    return issues;
  },
  cadenceCF: (cantus, counterpoint, severity, keySignature) => {
    const issues: LintMessage[] = [];
    if (cantus.length < 2) {
      return issues;
    }
    const last = cantus[cantus.length - 1];
    const prev = cantus[cantus.length - 2];
    const degree2 = majorDegreePitchClass(keySignature, 2);
    const degree1 = majorDegreePitchClass(keySignature, 1);
    if ((prev.midi % 12) !== degree2 || (last.midi % 12) !== degree1 || prev.midi <= last.midi) {
      issues.push(
        buildIssue(
          "cadenceCF",
          severity,
          "Cantus cadence should move from scale degree 2 down to scale degree 1.",
          cantus.length - 1
        )
      );
    }
    return issues;
  },
  cadenceCPT: (cantus, counterpoint, severity, keySignature) => {
    const issues: LintMessage[] = [];
    if (counterpoint.length < 2) {
      return issues;
    }
    const last = counterpoint[counterpoint.length - 1];
    const prev = counterpoint[counterpoint.length - 2];
    const degree7 = majorDegreePitchClass(keySignature, 7);
    const degree1 = majorDegreePitchClass(keySignature, 1);
    if ((prev.midi % 12) !== degree7 || (last.midi % 12) !== degree1 || prev.midi >= last.midi) {
      issues.push(
        buildIssue(
          "cadenceCPT",
          severity,
          "Counterpoint cadence should move from scale degree 7 up to scale degree 1.",
          counterpoint.length - 1
        )
      );
    }
    return issues;
  }
};

export function lintFirstSpecies(
  cantus: Note[],
  counterpoint: Note[],
  keySignature: KeySignature = "C major",
  config: RuleConfig = rulesConfig as RuleConfig,
  cantusIsUpper = false
): LintMessage[] {
  const issues: LintMessage[] = [];
  for (const rule of config.rules) {
    if (!rule.enabled) {
      continue;
    }
    const evaluator = RULE_IMPLEMENTATIONS[rule.id];
    if (!evaluator) {
      continue;
    }
    issues.push(...evaluator(cantus, counterpoint, rule.severity, keySignature, cantusIsUpper));
  }
  return issues;
}
