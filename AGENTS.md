# AGENTS.md Template

## Project Overview
- **Project name:** Counterpoint Checker
- **Purpose:** This project allows the user to input a cantus firmus and a line of counterpoint, and it will lint the result for errors.
- **Primary language(s):** Typescript/React
- **Main runtime(s):** <runtime/version>

## Repository Layout
- `src/`: <source code>
- `tests/`: <test suites>
- `docs/`: <documentation>
- `scripts/`: <automation scripts>

## Local Development
- **Install dependencies:** `npm install`
- **Run app/service:** `npm run dev`
- **Build app:** `npm run build`
- **Run tests:** `npm run test`
<!-- - **Lint/format:** `<command>` -->

## Coding Standards
- Use clear, descriptive names.
- Keep functions small and single-purpose.
- Add tests for new behavior and regressions.
- Prefer explicit error handling over silent failures.

## Agent Workflow Expectations
- Read this file and any referenced docs before making changes.
- Prefer minimal, targeted edits over broad refactors.
- Preserve existing architecture and naming unless asked otherwise.
- Document assumptions when requirements are ambiguous.

## Pull Request Checklist
- [ ] Behavior matches requested change.
- [ ] Tests added/updated and passing.
- [ ] Lint/format checks pass.
- [ ] Docs updated if behavior or setup changed.

## Review Focus
- Correctness and edge cases
- Regression risk
- Test coverage quality
- Security and performance implications

## Constraints and Guardrails
- Do not commit secrets or credentials.
- Avoid destructive operations unless explicitly requested.
- Confirm before changing public APIs or data formats.

## Project-Specific Notes
- This will be a webpage built in React
- The user will see a grand staff, that is, two musical staves connected with a brace, with a treble clef at the start of the upper staff, and a bass clef at the start of the lower staff.
- The staves will be empty at the start. Each empty staff will have a whole rest. 
- The user will be able to select a key signature
- The user will be able to select the number of measures from 8 through 13, inclusive
- The user should be able to clear the staves with a reset button
- The user should be able to select which of the staves is the cantus firmus line
- The user will see a palette with a number of tools on it. For now, the tools are
  - Whole note
  - Delete
- Users will click on lines and spaces to add notes, if the whole note tool is selected. If the note appears outside of the staff, leger lines will also be drawn. When the user adds or edits a note, they will hear it playback.
- Users will clear a measure and replace the note with a whole rest by clicking on it with the Delete tool active.
- The user can press a button to play back the audio of the notated pitches. It is not required that all measures are populated before playback
- When the music plays back, a visual "sweep" will identify the location of the currently played notes
- We will eventually extend the project to Second, Third, and Fourth species, but for now, we will only do First Species
- Develop a way of encoding counterpoint rules that the developer can modify (JSON?)
- Develop some of these rules for first-species counterpoint

## Counterpoint Rule Source Of Truth
- For future development, this section is the authoritative source of truth for all counterpoint rules.
- If any rule config in code (including JSON files) differs from this section, update code/config to match this section.
- The current first-species rule set is:
  - `equalLength`: Cantus and counterpoint must have the same number of notes.
  - `wholeNotesOnly`: First species uses only whole notes.
  - `noVoiceCrossing`: The lower voice should never meet or cross above the upper voice.
  - `verticalConsonance`: Every vertical interval must be consonant.
  - `perfectStartAndEnd`: Beginning and ending intervals must be perfect consonances.
  - `noParallelPerfects`: Avoid parallel fifths and octaves between adjacent notes.
  - `noRepeatedNotesCF`: The cantus firmus should not repeat the note played immediately before.
  - `oneRepeatedNoteCPT`: The counterpoint line may have no more than one repeated tone.
  - `uniqueClimax`: A voice's highest note should only appear once.
  - `cadenceCF`: The cantus firmus should end with scale degree 2 descending to scale degree 1.
  - `cadenceCPT`: The counterpoint line should end with scale degree 7 ascending to scale degree 1.

<!-- ## References
- `<link or path to contributing guide>`
- `<link or path to architecture docs>` -->
