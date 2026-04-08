# Comment Editor Module

The `comment-editor` module adds an optional markdown-focused editing experience for frontend comment creation and editing.

## What It Adds

-   Markdown WYSIWYG editor UI for:
    -   top-level new comment form
    -   edit-comment form
-   Server-side markdown rendering and sanitization for REST comment create/update requests tagged with `p2026_format=markdown`.
-   Raw markdown source persistence in comment meta (`_p2026_markdown_source`) so later edits round-trip the original markdown source.

## Files

-   PHP bootstrap: `modules/comment-editor/index.php`
-   Markdown processing: `modules/comment-editor/markdown-comments.php`
-   Frontend editor component: `src/modules/comment-editor/MarkdownCommentEditor.js`
-   Core UI integration points:
    -   `src/components/Comments.js`
    -   `src/components/Comment.js`

## Activation

This module is discovered automatically from `modules/*/index.php` and is **active by default**.

To disable it, use the plugin Modules settings screen or add `comment-editor` to the `p2026_disabled_modules` option.

## Request Contract

When frontend code submits markdown content, it sends:

-   `content`: markdown source string
-   `p2026_format`: `markdown`

The module then:

1. Converts markdown-like syntax to safe HTML on `rest_pre_insert_comment`.
2. Stores the original markdown source in comment meta on `rest_after_insert_comment`.

If `p2026_format` is not `markdown`, this module does not alter comment content.

## Notes

-   This is intentionally comment-scoped; post editing remains block-editor based.
-   Reply forms currently continue using the existing textarea/mentions control unless changed by future work.
