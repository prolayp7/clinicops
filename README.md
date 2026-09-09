# Healthcare Clinic Management MVP — Project Pack

This pack is the authoritative starting point for designing and building the agreed Phase-1 healthcare clinic management MVP from scratch.

## Recommended reading order

1. `PROJECT_REQUIREMENTS.md` — product scope, workflows, roles, acceptance criteria and exclusions.
2. `SCOPE_COST_MILESTONES.md` — agreed budget, payment stages and change control.
3. `DESIGN.md` — visual system, layout rules, responsive behavior and page specifications.
4. `GOOGLE_STITCH_PROMPTS.md` — prompts to generate the UI screens in Google Stitch.
5. `ARCHITECTURE.md` — application architecture, data model, security and engineering conventions.
6. `IMPLEMENTATION_PLAN.md` — milestones, dependencies and definition of done.
7. `AGENTS.md` — permanent instructions for Claude Code and Codex inside the repository.
8. `CLAUDE_CODE_PROMPTS.md` or `CODEX_PROMPTS.md` — execute one phase at a time.

## Scope statement

This is a responsive, single-clinic web application containing the core workflows for doctors, patients, appointments, consultations, prescriptions, laboratory work, billing, documents, reports, users and settings.

It is not an insurance-claims platform, certified e-prescribing system, telemedicine platform, multi-tenant SaaS, native mobile application or formal HIPAA compliance engagement.

## Using the pack

- Generate the design in Google Stitch first.
- Export approved screens/assets into the implementation repository.
- Add `AGENTS.md`, `PROJECT_REQUIREMENTS.md`, `DESIGN.md`, `ARCHITECTURE.md` and `IMPLEMENTATION_PLAN.md` to the repository root.
- Use either Claude Code or Codex for a phase, not both simultaneously on the same files.
- Start every phase from a clean Git branch and require tests before merging.
- Never paste real patient or protected health information into AI prompts, fixtures or screenshots.
