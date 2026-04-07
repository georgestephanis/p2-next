# Plan: Glossary And Knowledge Base

Status: Draft

Priority: Exploratory

Implementation Areas:

-   Frontend UI
-   REST API
-   Data model and storage
-   Editor UX

Depends on:

-   Optional dependency: [Support Tags Via Hashtag](./15-tags-via-hashtag.md) if inline term parsing infrastructure is shared.

## Estimated Size

Medium

## Risk

Medium. The basic feature is tractable, but term matching and over-linkification can degrade the reading experience if the content model is too naive.

Issue Reference:

-   GitHub issue `#18` — Glossary / Knowledge Base

Issue URL:

-   https://github.com/georgestephanis/p2026/issues/18

## Summary

Add a lightweight glossary or knowledge-base feature that defines recurring terms and shows inline definitions on hover.

## Why This Exists

The issue targets onboarding and shared vocabulary. It is conceptually similar to mentions and link previews, but for internal definitions instead of users or posts.

## Goals

-   Let teams define reusable terms and acronyms.
-   Surface definitions contextually in posts and comments.
-   Keep the authoring and reading experience lightweight.

## Non-Goals

-   Building a full wiki before validating the glossary use case.
-   Auto-defining terms without editorial review.

## Proposed Approach

-   Model terms with a dedicated CPT or taxonomy-backed object.
-   Linkify recognized terms in rendered content, likely with hovercards or tooltips.
-   Reuse hover infrastructure patterns from mentions and link previews where possible.
-   Evaluate a later authoring affordance for selecting text and creating a term inline.

## Open Questions

-   Should term matching be exact, case-insensitive, or context-aware?
-   How do we avoid over-linkifying common words?
-   Is this a glossary first, with richer knowledge-base behavior later?

## Acceptance Criteria

-   Editors can define glossary entries.
-   Defined terms are surfaced in posts and comments with an accessible inline definition affordance.
-   Term matching is predictable and does not create excessive false positives.
