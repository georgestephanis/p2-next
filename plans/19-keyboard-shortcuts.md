# Plan: Keyboard Shortcuts

Status: Draft

Depends on:
- No hard dependency.
- Optional dependency: settled interaction targets for post focus, comments toggle, and post editing.

Issue Reference:
- GitHub issue `#16` — Keyboard Shortcuts

## Summary

Add a power-user keyboard shortcut layer for feed navigation and common actions.

## Why This Exists

The open issue targets fast keyboard-driven use of the collaboration feed with actions such as new post, post navigation, comments toggle, edit, and a help overlay.

## Goals

- Support a small, memorable shortcut set.
- Avoid conflicting with editor text entry and browser-native shortcuts.
- Provide discoverability through a help overlay.

## Non-Goals

- Rebinding every possible action.
- Breaking accessibility expectations for screen readers or form inputs.

## Proposed Approach

- Add a global shortcut manager that is aware of focus context.
- Start with the issue's baseline commands:
  - `n` for new post
  - `j` and `k` to move between posts
  - `c` to toggle comments
  - `e` to edit the focused post
  - `?` to open shortcut help
- Define a visible focus model for posts if one does not already exist.

## Open Questions

- How should focus work across posts, comments, and modal editors?
- Should shortcuts be user-configurable?
- How should mobile and touch contexts suppress or ignore these bindings?

## Acceptance Criteria

- Supported shortcuts work reliably outside active text inputs.
- A help overlay documents the available shortcuts.
- Keyboard navigation has a visible focus target in the feed.
