# Plan: Draft Auto-Save And Preview

Status: Draft

Depends on:
- Optional dependency: [Drafts Index](./04-drafts-index.md) for a destination to manage saved drafts.

Issue Reference:
- GitHub issue `#15` — Draft Auto-Save and Preview

## Summary

Add draft persistence across reloads and a way to preview authored content before publishing.

## Why This Exists

Longer-form writing is risky without autosave. The open issue also calls for a preview mode so the author can inspect rendered output before publishing.

## Goals

- Preserve in-progress work across accidental reloads or navigation.
- Prefer server-backed drafts when possible, with a client-side fallback if needed.
- Provide a clear preview mode that reflects frontend rendering.

## Non-Goals

- Full collaborative live-editing on the same draft.
- Solving offline-first editing completely in the first pass.

## Proposed Approach

- Reuse existing new-post and post-editor flows.
- Decide when a new draft record should be created versus when local storage is enough.
- Add an explicit preview mode or panel that uses the same rendering pipeline as published content.

## Open Questions

- Should drafts be persisted eagerly on first keystroke or on debounce?
- Should autosave exist for comments too, or only posts?
- How should conflicts between local storage and server drafts be resolved?

## Acceptance Criteria

- In-progress post content survives a reload or accidental navigation in at least one supported persistence mode.
- Authors can preview rendered output before publishing.
- Resuming a saved draft is straightforward and does not create duplicate content unexpectedly.
