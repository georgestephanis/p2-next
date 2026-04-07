# Sidebar Shell Module

Optional fixed, collapsible sidebar panel for WordPress themes that do not expose a native sidebar area.

## Overview

The Sidebar Shell adds a persistent sidebar overlay anchored to the right edge of the viewport. It is designed as a fallback for themes that lack their own sidebar — block themes without a `parts/sidebar.html` template part and classic themes without a `sidebar.php` template file. On themes that already provide sidebar support, the module defaults to **inactive** and must be explicitly enabled on the Modules settings page.

The sidebar always renders the `p2026/feed-tools` block (search widget and post-state filter) at the top. Below that it shows either:

1. Active widgets from the `p2026-sidebar-shell` widget area (added via **Appearance → Widgets**), or
2. Configurable default block content (set on the **Sidebar Shell** settings tab), falling back to Search + Latest Posts + Latest Comments if nothing has been saved.

## Files

| File | Purpose |
|------|---------|
| `modules/sidebar-shell/index.php` | PHP module: widget area registration, frontend render, settings tab + save hook, admin asset enqueue |
| `src/modules/sidebar-shell/index.js` | Vanilla JS: collapse/expand controller, `localStorage` persistence, keyboard handling |
| `src/modules/sidebar-shell/SidebarControls.js` | React component: post-state filter buttons + `SearchWidget`; mounted by the `p2026/feed-tools` block view script |
| `src/modules/sidebar-shell/admin.js` | Standalone `BlockEditorProvider` for the Sidebar Shell settings tab block editor |
| `src/modules/sidebar-shell/_sidebar-shell.scss` | Frontend styles: fixed positioning, collapse transition, card layout, page-width reservation |
| `src/modules/sidebar-shell/admin.scss` | Admin styles: editor chrome for the settings tab block editor |
| `src/blocks/feed-tools/` | Dynamic block registered alongside this module; renders the feed controls container |

## Activation Logic

`sidebar-shell` uses a **context-aware default**. `p2026_module_default_is_active( 'sidebar-shell' )` returns:

- `true` — when neither `sidebar.php` nor `parts/sidebar.html` (or `block-template-parts/sidebar.html`) is found in the active or parent theme.
- `false` — when the theme appears to have native sidebar support.

This default can be overridden per-site on the **P2026 Settings → Modules** page regardless of theme detection.

## WordPress Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `p2026_sidebar_shell_default_blocks` | `string` | `''` | Serialized block markup for default sidebar content. Empty string means use built-in defaults (search, latest-posts, latest-comments). |
| `p2026_sidebar_shell_default_visible` | `string` | `'1'` | `'1'` = sidebar open on page load; `'0'` = collapsed by default. |
| `p2026_sidebar_shell_allow_collapse` | `string` | `'1'` | `'1'` = toggle button visible; `'0'` = sidebar permanently visible, no toggle. |

## Widget Area

Registers the `p2026-sidebar-shell` widget area (ID). Widgets added here are rendered inside the shell panel and take precedence over the default block content — when the widget area is active, the default block content is not rendered.

## Frontend Rendering

`p2026_sidebar_shell_render()` is hooked to `wp_footer` at priority 20. It outputs the shell container only when there is content to show (active widgets or non-empty block markup). The PHP output includes:

- `data-p2026-sidebar-shell` — mount target for the JS module.
- `data-default-open` — `'1'` or `'0'`; initial visibility state.
- `data-allow-collapse` — `'1'` or `'0'`; whether the toggle button is rendered.
- `is-initializing` CSS class — removed by JS in the next `requestAnimationFrame` to prevent the un-transitioned state from flashing.
- A `<noscript>` block that overrides `visibility: hidden` on `.is-initializing` so the shell is always visible without JavaScript.

## JavaScript Behaviour

`src/modules/sidebar-shell/index.js` reads the data attributes above and:

1. Checks `localStorage` for a previously persisted collapse state (`p2026.sidebarShell.collapsed`). If found, it overrides the PHP-supplied default.
2. Applies `is-collapsed` on the root element and `p2026-sidebar-shell-visible` on `<html>` / `<body>` to drive CSS transitions and page-width reservation.
3. Wires the toggle button click and `Escape` key to open/collapse with focus management.
4. Removes `is-initializing` so CSS transitions become active.

Focus management:
- Opening moves focus to the first focusable element inside the panel (or the panel itself if none exists).
- Closing via `Escape` returns focus to the toggle button.

## CSS Architecture

The stylesheet uses CSS custom properties for sizing and motion:

| Property | Default | Purpose |
|----------|---------|---------|
| `--p2026-sidebar-shell-panel-width` | `min(360px, 100vw - 28px)` | Panel width |
| `--p2026-sidebar-shell-reserve-width` | `min(392px, 100vw - 4px)` | Width reserved from the page at ≥960 px |
| `--p2026-sidebar-shell-motion-duration` | `0.22s` | Collapse/expand transition duration |
| `--p2026-sidebar-shell-motion-ease` | `linear` | Transition easing |

At viewport widths ≥960 px the `html` element's `width` is reduced by `--p2026-sidebar-shell-reserve-width` (via the `p2026-sidebar-shell-visible` class) to push page content left rather than overlapping it.

## PHP Filters and Actions

| Hook | Type | Arguments | Description |
|------|------|-----------|-------------|
| `p2026_sidebar_shell_block_content` | filter | `string $markup` | Overrides the block markup rendered inside `.p2026-sidebar-shell__blocks`. Return an empty string to suppress the blocks area entirely. |
| `p2026_settings_save_tab_sidebar-shell` | action | — | Fired by the settings handler after nonce verification when the Sidebar Shell tab form is submitted. The module's save function is hooked here. |
| `p2026_settings_render_tab_sidebar-shell` | action | `string $tab` | Fired to render the Sidebar Shell settings tab content. |

## Admin Block Editor

The **Sidebar Shell** settings tab embeds a minimal `BlockEditorProvider` that lets administrators compose the default sidebar block content visually. Allowed block types are limited to sidebar-appropriate blocks (search, latest posts/comments, categories, tags, calendar, RSS, HTML, image, heading, paragraph, separator, spacer, group, and `p2026/feed-tools`).

The editor syncs its serialized output to a hidden `<textarea>` which is submitted with the standard settings form POST. If the block editor fails to mount (e.g. required core blocks unavailable), the raw `<textarea>` remains visible as a fallback.

## Adding Sidebar Block Content Programmatically

Use the `p2026_sidebar_shell_block_content` filter to inject block markup regardless of the admin setting:

```php
add_filter( 'p2026_sidebar_shell_block_content', function ( $markup ) {
    return $markup . '<!-- wp:latest-posts {"postsToShow":5} /-->';
} );
```

Return an empty string to suppress the blocks area and rely solely on the widget area.
