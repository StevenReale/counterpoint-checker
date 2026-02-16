export type RhythmValue = "whole";

export type Note = {
  midi: number;
  rhythm: RhythmValue;
};

export type KeySignature =
  | "C major"
  | "G major"
  | "D major"
  | "A major"
  | "E major"
  | "F major"
  | "Bb major";

export type LintSeverity = "error" | "warning";

export type LintMessage = {
  ruleId: string;
  severity: LintSeverity;
  message: string;
  index?: number;
};

export type RuleConfig = {
  species: "first";
  rules: Array<{
    id: string;
    enabled: boolean;
    severity: LintSeverity;
    description: string;
  }>;
};
