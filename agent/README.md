# Agent capability system

This directory is the single entry point for project-local agent capabilities.

- `manifest.json` describes the discovery roots and schema version.
- `pnpm agent:audit` scans source, API routes, scripts, and hooks and writes a
  deterministic report to `docs/AGENT_CAPABILITY_AUDIT.md`.

The audit is deliberately zero-dependency. It reports what exists and what is
missing; it does not execute discovered code, load secrets, or install remote
components.
