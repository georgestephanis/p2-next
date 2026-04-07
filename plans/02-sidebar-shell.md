# Plan: Sidebar Shell And Layout

Status: Shipped (branch `add/02-sidebar-shell`)

Priority: Now

Implementation Areas:

-   Frontend UI
-   Theme integration
-   Data model and storage

Depends on:

-   No hard dependency.

## Estimated Size

Architectural

## Risk

High. This is partly a product-scope decision and could push `p2026` away from its theme-agnostic design if handled poorly.

## Summary

`p2026` ships an optional collapsible sidebar shell for themes that lack native sidebar support. It is implemented as a module (`modules/sidebar-shell/`) that auto-activates on themes without a `sidebar.php` or `parts/sidebar.html` template file, and can be toggled per-site from the Modules settings page.

## Why This Exists

`p2020` assumes a sidebar-first information architecture. Several other missing features, especially widgets and quick-link views, fit naturally into that shell.

## Goals

-   Decide whether sidebar layout is inside `p2026` scope. ✓ Yes, as an optional module.
-   Provide an optional, theme-safe shell rather than baking layout assumptions into core enhancement code. ✓
-   Support persisted collapsed and expanded state. ✓ Via `localStorage`.

## Non-Goals

-   Forcing all themes into a sidebar layout. ✓ Preserved — auto-inactive on themes with own sidebar.
-   Replacing a theme's overall page structure. ✓ Preserved — shell injects via `wp_footer`.

## What Was Built

-   **`modules/sidebar-shell/index.php`** — Registers a `p2026-sidebar-shell` widget area, renders the shell container in `wp_footer` (priority 20), provides a Sidebar Shell settings tab with an embedded block editor for configuring default block content.
-   **`src/modules/sidebar-shell/index.js`** — Vanilla JS collapse/expand controller. Reads PHP-supplied defaults from `data-*` attributes, overrides with `localStorage` if present, applies `is-collapsed` and `p2026-sidebar-shell-visible` classes, handles `Escape` key and focus management.
-   **`src/modules/sidebar-shell/SidebarControls.js`** — React component (search widget + post-state filter) mounted by the `p2026/feed-tools` block view script. Returns null for logged-out users.
-   **`src/modules/sidebar-shell/admin.js`** — Standalone `BlockEditorProvider` on the Sidebar Shell settings tab. Syncs serialised block markup to a hidden `<textarea>` for form POST delivery; degrades to raw textarea if editor cannot mount.
-   **`src/blocks/feed-tools/`** — New `p2026/feed-tools` dynamic block. Server-renders a mount target (logged-in users only); `view.js` mounts `SidebarControls` into it. Always injected at the top of the sidebar tools area.
-   **Module activation model extended** — `sidebar-shell` introduced a context-aware default: active when theme has no detected sidebar, inactive otherwise. `p2026_module_default_is_active()` encodes this logic; settings page honours the override.

## Open Questions — Resolved

| Question | Resolution |
|----------|------------|
| Block, template part, or module? | Module (`modules/sidebar-shell/`) with an accompanying dynamic block (`p2026/feed-tools`) for the interactive controls area. |
| Block vs classic theme support? | Both. Block themes get `do_blocks()` default content; classic themes use the widget area. Detection via `p2026_sidebar_shell_supports_blocks()`. |
| Does `p2026` own sidebar rendering? | Yes, as an opt-in fallback only. Themes with native sidebars are unaffected. |

## Acceptance Criteria — Status

-   ✅ A theme can opt into a `p2026` sidebar shell without losing compatibility.
-   ✅ The sidebar can be collapsed and expanded.
-   ✅ Collapsed state persists across page loads (localStorage).
-   ✅ Core `p2026` features still work when the sidebar shell is absent.

## Source References

-   [https://wpcom-themes.svn.automattic.com/p2020/inc/toggle-sidebar/toggle-sidebar.php](https://wpcom-themes.svn.automattic.com/p2020/inc/toggle-sidebar/toggle-sidebar.php)
-   Implementation: `modules/sidebar-shell/`, `src/modules/sidebar-shell/`, `src/blocks/feed-tools/`
-   Architecture notes: `modules/sidebar-shell/README.md`
