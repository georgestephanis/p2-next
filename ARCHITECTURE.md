# p2026 Architecture

This plugin adds real-time P2/o2-style collaboration features by progressively enhancing theme-rendered post lists.

This document reflects the 0.4.0 release line.

## Core Ideas

-   Theme HTML remains the source of truth for initial rendering.
-   React portals add controls and editors into existing DOM nodes.
-   A shared `@wordpress/data` store (`p2026`) drives posts/comments/editor UI state.
-   REST API requests are authenticated with nonce + root URL from `window.p2026Config`.
-   JS modules are loaded from `window.p2026Config.activeModules`.

## Runtime Request/Data Flow

```mermaid
flowchart TD
    A[wp_enqueue_scripts in p2026.php] --> B[Enqueue build/frontend.js]
    A --> B2[Enqueue build/interactivity.module.js via Script Modules API]
    A --> C[Inject window.p2026Config]

    B --> D[src/frontend.js]
    B2 --> D2[src/interactivity/module-entry.js]
    C --> D
    D2 --> D3[Expose window.__p2026InteractivityApi bridge]

    D --> E[initApiFetch middleware]
    D --> E1[Init shared interactivity hosts via bridge API]
    D --> F[find feed container + collect post elements]
    D --> AF[Load active JS modules]
    AF --> AG[Notifications dock mount]
    AF --> AL[Link previews module mount]
    AL --> AM[GET /p2026/v1/link-preview?url=...]
    D --> AB[Mount NewPostModal root]
    D --> AC[Init admin bar New Post interactivity]
    AC -->|block on page| AD[Scroll + focus existing editor]
    AC -->|no block| AE[openNewPostModal dispatch]
    AE --> AB
    F --> AH[Compute query/header eligibility]
    AH --> G[Mount FeedEnhancer hidden root]

    G --> AI[Mount Search + Unread header only when main query AND archive-like view]
    G --> H[Seed lastFetched from newest visible post]
    G --> I[startPolling every 15s]

    I --> J[GET /wp/v2/posts?after=lastFetched]
    J --> K[store.pendingPosts + pendingCount]
    K --> L[New posts banner]
    L --> M[revealPendingPosts]
    M --> N[Prepend pending posts in store]

    G --> O[Per-post PostEnhancement portal]
    O --> P[Toggle comments]
    P --> Q[GET /wp/v2/comments?post=id]
    Q --> R[Render threaded comments tree]

    O --> S[Inline edit]
    S --> T[GET /wp/v2/posts/id?context=edit]
    T --> U[Block parse + PostEditor]
    U --> V[POST /wp/v2/posts/id]

    W[new-post dynamic block view.js] --> E
    W --> X[NewPostEditor]
    X --> Y[POST /wp/v2/posts]

    AN[WP Admin P2026 Settings Audit Log tab] --> AO[Enqueue build/audit-log-viewer.js + css]
    AO --> AP[src/modules/audit-log/audit-log-viewer.js]
    AP --> AQ[GET /p2026/v1/audit-log/days]
    AP --> AR[GET /p2026/v1/audit-log/entries]
    AP --> AS[useEntityRecords users/posts/comments for related labels]
    AP --> AT[Dynamic init link previews + mentions hovercards]
```

## File-Level Responsibilities

-   `p2026.php`: block registration, frontend enqueue, config injection, auto-title filter, admin bar node.
-   `src/frontend.js`: enhancement bootstrap, archive/main-query header gating, modal root, admin bar button wiring.
-   `src/interactivity/`: Interactivity API stores + directive host wiring for lightweight interaction islands.
-   `src/interactivity/module-entry.js`: script-module bootstrap that loads interactivity implementations and publishes bridge methods for classic callers.
-   `src/interactivity/client-bridge.js`: classic-script facade used by frontend/modules/api code to invoke module-loaded interactivity methods.
-   `src/store/index.js`: post/comment/polling/editor/modal state and async actions.
-   `src/api/index.js`: `apiFetch` middleware and polling utility.
-   `src/utils/on-dom-ready.js`: shared helper for DOM-ready-safe module bootstrap.
-   `src/components/FeedEnhancer.js`: polling orchestration, banner handling, and conditional search/unread header portal.
-   `src/components/SearchWidget.js`: debounced unified post/comment search modal with request-staleness protection.
-   `src/components/UnreadBadge.js`: read-state display and sync trigger.
-   `src/components/PostEnhancement.js`: comments/edit controls per post.
-   `src/components/Comments.js` + `src/components/Comment.js`: threaded comment UI and replies.
-   `src/components/PostEditor.js`: inline edit existing posts with block editor.
-   `src/blocks/new-post/view.js` + `src/components/NewPostEditor.js`: frontend new post editor (also used inside modal).
-   `src/components/NewPostModal.js`: modal wrapper for new-post editor; driven by `newPostModalOpen` store state.
-   `src/blocks/new-post/render.php`: mount point output gated by `publish_posts`.
-   `src/modules/index.js`: loads active JS modules from `window.p2026Config.activeModules`.
-   `includes/github-updates.php`: integrates the plugin `Update URI` with GitHub releases, prereleases, and trunk builds.
-   `modules/link-previews/index.php`: internal link preview REST endpoint and transient caching.
-   `src/modules/link-previews/`: internal-link hover/focus preview card UI.
-   `admin/settings.php`: admin UI for module toggles and audit backend selection.
-   `modules/post-state/index.php`: taxonomy-backed post state, REST field, and state mutation endpoint.
-   `modules/audit-log/index.php`: audit event persistence handler (uploads JSONL or internal CPT), audit settings tab, and admin REST endpoints.
-   `src/modules/audit-log/audit-log-viewer.js`: audit entries browser in WP Admin using DataViews and entity lookups.
-   `src/modules/notifications/`: notification dock UI mounted into `document.body`.

## JS Hierarchy And Conventions

-   `src/frontend.js` remains the canonical frontend bootstrap entry.
-   `src/store/index.js` remains the canonical cross-feature state boundary.
-   `src/modules/*` owns feature behavior, presentation, and feature-specific APIs.
-   `src/interactivity/*` owns Interactivity API store namespaces and directive host wiring.
-   `src/utils/*` owns small cross-domain helpers (for example, DOM-ready bootstrapping).

### Interactivity Placement Rule

-   Place shared Interactivity API wiring in `src/interactivity/*`.
-   Keep feature logic in `src/modules/*` or `src/components/*`.
-   Connect the two by passing feature handlers into interactivity initializers.
-   Use `src/interactivity/index.js` for exports that are consumed across domains.- Keep direct imports of interactivity implementation files out of classic bundles; consume bridge exports instead.

### Namespace And Host Conventions

-   Namespace format: `p2026/<feature-name>`.
-   Host IDs: `p2026-<feature-name>-interactive`.
-   Host nodes should be hidden and mounted once.
-   Interactivity actions should delegate to existing store thunks/selectors when state already lives in `@wordpress/data`.

### Bootstrap Convention

-   Use `src/utils/on-dom-ready.js` instead of ad hoc `DOMContentLoaded` checks.
-   Keep direct `document.addEventListener( 'DOMContentLoaded', ... )` out of feature modules.

### Script Module Constraint

-   Interactivity APIs load from Script Modules (`@wordpress/interactivity`) and are enqueued separately from classic scripts.
-   Modules cannot depend on script handles (`wp-data`, `wp-api-fetch`, etc.); interop uses `window.wp.*` globals where required.
-   Do not re-introduce `wp-interactivity` into `build/frontend.asset.php`; interactivity dependencies should live in `build/interactivity.module.asset.php`.

## Module Activation

-   Modules are discovered by scanning `modules/*/index.php`.
-   Activation uses an opt-out deny-list option: `p2026_disabled_modules`.
-   `window.p2026Config.activeModules` is derived server-side as discovered modules minus disabled modules.
-   New modules default to active unless explicitly disabled.

## Integration Boundaries

-   Depends on WordPress REST endpoints under `/wp/v2`.
-   Uses plugin REST endpoints under `/p2026/v1` for search, read-state, and optional modules.
-   Depends on existing theme loop markup for post discovery.
-   Header search/unread widgets are gated by main-query detection plus `window.p2026Config.isArchiveView`.
-   Build output in `build/` is generated via `@wordpress/scripts` and block manifest support.

Plugin REST endpoints currently include:

-   `/p2026/v1/search`
-   `/p2026/v1/read-state`
-   `/p2026/v1/read-state/sync`
-   `/p2026/v1/users`
-   `/p2026/v1/users/{id}`
-   `/p2026/v1/link-preview`
-   `/p2026/v1/notifications`
-   `/p2026/v1/notifications/{id}/read`
-   `/p2026/v1/notifications/read-all`
-   `/p2026/v1/posts/{id}/state`
-   `/p2026/v1/audit-log/days`
-   `/p2026/v1/audit-log/entries`

## Search Behavior Note

-   `GET /p2026/v1/search` is currently logged-in only.
-   Current SQL filters scope results to content authored by the current user.
