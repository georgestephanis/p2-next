# p2-next Architecture

This plugin adds real-time P2/o2-style collaboration features by progressively enhancing theme-rendered post lists.

## Core Ideas

- Theme HTML remains the source of truth for initial rendering.
- React portals add controls and editors into existing DOM nodes.
- A shared `@wordpress/data` store (`p2-next`) drives posts/comments/editor UI state.
- REST API requests are authenticated with nonce + root URL from `window.p2NextConfig`.

## Runtime Request/Data Flow

```mermaid
flowchart TD
    A[wp_enqueue_scripts in p2-next.php] --> B[Enqueue build/frontend.js]
    A --> C[Inject window.p2NextConfig]

    B --> D[src/frontend.js]
    C --> D

    D --> E[initApiFetch middleware]
    D --> F[find feed container + collect post elements]
    F --> G[Mount FeedEnhancer hidden root]

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
```

## File-Level Responsibilities

- `p2-next.php`: block registration, frontend enqueue, config injection, auto-title filter.
- `src/frontend.js`: enhancement bootstrap and portal mounting.
- `src/store/index.js`: post/comment/polling/editor state and async actions.
- `src/api/index.js`: `apiFetch` middleware and polling utility.
- `src/components/FeedEnhancer.js`: polling orchestration and banner handling.
- `src/components/PostEnhancement.js`: comments/edit controls per post.
- `src/components/Comments.js` + `src/components/Comment.js`: threaded comment UI and replies.
- `src/components/PostEditor.js`: inline edit existing posts with block editor.
- `src/blocks/new-post/view.js` + `src/components/NewPostEditor.js`: frontend new post editor.
- `src/blocks/new-post/render.php`: mount point output gated by `publish_posts`.

## Integration Boundaries

- Depends on WordPress REST endpoints under `/wp/v2`.
- Depends on existing theme loop markup for post discovery.
- Build output in `build/` is generated via `@wordpress/scripts` and block manifest support.
