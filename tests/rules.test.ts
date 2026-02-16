import { describe, expect, it } from "vitest";
import { lintFirstSpecies } from "../src/music/rules/engine";
import type { Note } from "../src/music/types";

function notes(midis: number[]): Note[] {
  return midis.map((midi) => ({ midi, rhythm: "whole" }));
}

describe("first species linting", () => {
  it("accepts a simple valid line", () => {
    const cantus = notes([62, 64, 65, 67, 69, 67, 62, 60]);
    const counterpoint = notes([69, 67, 74, 71, 78, 71, 71, 72]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result).toHaveLength(0);
  });

  it("flags dissonant vertical intervals", () => {
    const cantus = notes([60, 62, 64]);
    const counterpoint = notes([67, 68, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "verticalConsonance")).toBe(true);
  });

  it("flags voice crossing", () => {
    const cantus = notes([60, 62, 64]);
    const counterpoint = notes([67, 62, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "noVoiceCrossing")).toBe(true);
  });

  it("does not flag voice crossing when cantus is upper and lower stays below", () => {
    const cantusUpper = notes([72, 74, 76]);
    const counterpointLower = notes([60, 62, 64]);

    const result = lintFirstSpecies(cantusUpper, counterpointLower, "C major", undefined, true);
    expect(result.some((issue) => issue.ruleId === "noVoiceCrossing")).toBe(false);
  });

  it("flags parallel perfect intervals", () => {
    const cantus = notes([60, 62, 64]);
    const counterpoint = notes([67, 69, 71]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "noParallelPerfects")).toBe(true);
  });

  it("flags repeated adjacent notes in cantus", () => {
    const cantus = notes([60, 60, 62, 64]);
    const counterpoint = notes([67, 69, 71, 72]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "noRepeatedNotesCF")).toBe(true);
  });

  it("flags more than one repeated adjacent note in counterpoint", () => {
    const cantus = notes([62, 64, 65, 67, 69, 67, 62, 60]);
    const counterpoint = notes([69, 69, 74, 71, 71, 71, 71, 72]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "oneRepeatedNoteCPT")).toBe(true);
  });

  it("flags non-unique climax in either voice", () => {
    const cantus = notes([62, 64, 69, 67, 69, 67, 62, 60]);
    const counterpoint = notes([69, 67, 74, 71, 78, 71, 71, 72]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "uniqueClimax")).toBe(true);
  });

  it("flags cadence issues", () => {
    const cantus = notes([62, 64, 65, 67, 69, 67, 64, 60]);
    const counterpoint = notes([69, 67, 74, 71, 78, 71, 69, 72]);

    const result = lintFirstSpecies(cantus, counterpoint);
    expect(result.some((issue) => issue.ruleId === "cadenceCF")).toBe(true);
    expect(result.some((issue) => issue.ruleId === "cadenceCPT")).toBe(true);
  });
});
