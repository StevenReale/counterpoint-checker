import type { LintMessage, Note, RuleConfig } from "../types";
import rulesConfig from "./firstSpeciesRules.json";

type RuleEvaluator = (
  cantus: Note[],
  counterpoint: Note[],
  severity: "error" | "warning"
) => LintMessage[];

const PERFECT_INTERVALS = new Set([0, 7]);
const CONSONANT_INTERVALS = new Set([0, 3, 4, 7, 8, 9]);

function intervalMod12(low: number, high: number): number {
  return Math.abs(high - low) % 12;
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
  counterpointAboveCantus: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];
    const length = Math.min(cantus.length, counterpoint.length);
    for (let i = 0; i < length; i += 1) {
      if (counterpoint[i].midi <= cantus[i].midi) {
        issues.push(
          buildIssue(
            "counterpointAboveCantus",
            severity,
            "Counterpoint should stay above cantus.",
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
  noRepeatedNotes: (cantus, counterpoint, severity) => {
    const issues: LintMessage[] = [];

    for (let i = 1; i < cantus.length; i += 1) {
      if (cantus[i].midi === cantus[i - 1].midi) {
        issues.push(
          buildIssue(
            "noRepeatedNotes",
            severity,
            "Cantus repeats the previous note.",
            i
          )
        );
      }
    }

    for (let i = 1; i < counterpoint.length; i += 1) {
      if (counterpoint[i].midi === counterpoint[i - 1].midi) {
        issues.push(
          buildIssue(
            "noRepeatedNotes",
            severity,
            "Counterpoint repeats the previous note.",
            i
          )
        );
      }
    }

    return issues;
  }
};

export function lintFirstSpecies(
  cantus: Note[],
  counterpoint: Note[],
  config: RuleConfig = rulesConfig as RuleConfig
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
    issues.push(...evaluator(cantus, counterpoint, rule.severity));
  }
  return issues;
}
