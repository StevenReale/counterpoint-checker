import { describe, expect, it } from "vitest";
import { lintFirstSpecies } from "../src/music/rules/engine";
import type { Note } from "../src/music/types";

function notes(midis: number[]): Note[] {
  return midis.map((midi) => ({ midi, rhythm: "whole" }));
}

describe("first species linting", () => {
  it("accepts a simple valid line", () => {
    const cantus = notes([60, 62, 64, 65, 67, 65, 64, 60]);
    const counterpoint = notes([67, 71, 72, 74, 76, 74, 72, 67]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result).toHaveLength(0);
  });

  it("flags dissonant vertical intervals", () => {
    const cantus = notes([60, 62, 64]);
    const counterpoint = notes([67, 68, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "verticalConsonance")).toBe(true);
  });

  it("flags parallel perfect intervals", () => {
    const cantus = notes([60, 62, 64]);
    const counterpoint = notes([67, 69, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "noParallelPerfects")).toBe(true);
  });

  it("flags repeated adjacent notes in either voice", () => {
    const cantus = notes([60, 60, 62, 64]);
    const counterpoint = notes([67, 69, 69, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    const repeated = result.filter((issue) => issue.ruleId === "noRepeatedNotes");
    expect(repeated.length).toBe(2);
  });
});
