# P2026 Enhancement Implementation Plan

## Overview

This plan addresses the three highest-impact enhancements for p2026:

1. Search Across Posts and Comments
2. Read / Unread Tracking
3. Notification Dock / Flash Notifications

**Implementation Timeline:** Estimated 3-4 feature branches

---

## 1. Search Across Posts and Comments (Core)

### Architecture Decision: CORE (not a module)

**Rationale:** Search is foundational—every user needs it. It's deeply integrated with core post/comment display logic and feed discoverability. Belongs in the plugin core.

### PHP Backend (REST)

**New Endpoint:** `GET /wp-json/p2026/v1/search?q={query}&type={posts|comments|all}&limit=20`

**Implementation:**

-   Create `includes/api/search.php` with:
    -   `p2026_register_search_route()` — registers REST endpoint
    -   `p2026_search_posts_and_comments()` — unified search callback
    -   `p2026_index_post_for_search()` — hook into post save to maintain index (use post_meta or custom table later)

**Search Strategy:**

-   Query `wp_posts` with `WHERE post_content LIKE '%query%' OR post_title LIKE '%query%'`
-   Query `wp_comments` with `WHERE comment_content LIKE '%query%'`
-   Results include source (post/comment), excerpt, parent context
-   Support quoted phrases and multi-word with `AND` logic
-   Results capped at 20; pagination via `offset` parameter
-   Respect post privacy (only published posts/approved comments visible to user)

**Performance Guardrails:**

-   No full-text indexing yet (defer to future MySQL FT+ upgrade)
-   LIMIT results strictly to prevent OOM on large DBs
-   Consider `_search_posts` post_meta caching if performance degrades

### React Frontend

**New Component:** `src/components/SearchWidget.js`

-   Mounted in FeedEnhancer header (before banner/feed)
-   Debounced input (300ms) → triggers search
-   Results displayed in modal/dropdown overlay
-   Result format: `[post/comment] — excerpt + "in [Post Title]"`
-   Link click navigates + expands/scrolls to comment
-   Keyboard shortcut: `Cmd/Ctrl + K` to focus (optional later)
-   Empty state: "Search posts and comments" placeholder

**Store Integration:** `src/store/index.js`

-   Add state: `searchQuery`, `searchResults`, `searchLoading`
-   Add actions: `setSearchQuery()`, `fetchSearchResults()` (async thunk)
-   Selector: `getSearchResults()`, `isSearching()`

**Styling:** Add to `src/styles.scss`

-   Search input bar styling
-   Modal/dropdown overlay
-   Result item styling with post/comment distinction

---

## 2. Read / Unread Tracking (Core)

### Architecture Decision: CORE

**Rationale:** Read state is per-user and affects UI display everywhere (badges, filtering). Belongs in core store and permissions model.

### PHP Backend

**New User Meta Key:** `p2026_last_activity` (ISO timestamp)

**Implementation:**

-   In `p2026.php`, hook `wp_login` to reset `p2026_last_activity` on login
-   Create `includes/api/read-state.php` with:
    -   `p2026_get_user_last_activity()` — fetch user meta
    -   `p2026_update_last_activity()` — update on REST calls (hook `rest_post_dispatch`)
    -   REST route `GET /wp-json/p2026/v1/read-state` — returns user's last_activity + unread count

**Unread Count Logic:**

-   Posts created after `p2026_last_activity` are unread
-   Cap count at 100 (client-side UI rule)
-   Formula: `COUNT(posts.id) WHERE posts.post_date_gmt > user_last_activity AND posts.post_status = 'publish'`

**Update Mechanism:**

-   Endpoint `POST /wp-json/p2026/v1/read-state/sync` — client sends current timestamp
-   Server updates `p2026_last_activity = now()` for the user
-   Response: new unread count (for eventual re-render)

### React Frontend

**New Store State:** (in `src/store/index.js`)

-   `userReadState: { lastActivity, unreadCount }`
-   `readStateLoading: false`

**New Component:** `src/components/UnreadBadge.js`

-   Displays unread count badge (e.g., "7 unread")
-   Mounted in PostsFeed header or banner area
-   Click → reveal new posts (integrates with existing FeedEnhancer banner flow)
-   Hidden if count === 0

**Store Actions:**

-   `fetchReadState()` — async thunk, calls `GET /wp-json/p2026/v1/read-state`
-   `syncReadState()` — async thunk, calls `POST /wp-json/p2026/v1/read-state/sync` when user reveals posts or navigates away
-   `setUnreadCount(count)` — update local state

**Lifecycle Integration:**

-   `FeedEnhancer` mounts → calls `fetchReadState()` once to get initial count
-   On `revealPendingPosts()` → call `syncReadState()` to mark posts as read
-   On page `beforeunload`/tab `visibilitychange` to 'hidden' → call `syncReadState()`

**Styling:**

-   Badge styling in `src/styles.scss` (small pill with count)

---

## 3. Notification Dock / Flash Notifications (Independent Module)

### Architecture Decision: MODULE (`modules/notifications/`)

**Rationale:** Notifications are a feature enhancement, not core to the basic P2026 loop. Can be toggled on/off independently. Users may prefer different notification strategies (Slack, native push, etc.). Ideal module pattern.

### Module Structure

```
modules/notifications/
├── index.php                 # REST endpoints, notification storage hook
├── README.md                 # Feature docs
src/modules/notifications/
├── index.js                  # Side-effect import (add to src/modules/index.js)
├── NotificationDock.js       # Main dock component
├── NotificationItem.js       # Single notification renderer
├── _notifications.scss       # Styling
└── useNotifications.js       # Custom hook for notification state
```

### PHP Backend

**New Database:** Custom postmeta or new table `wp_p2026_notifications`

-   Schema: `(id, user_id, type, source_post_id, source_comment_id, source_user_id, unread, created_at)`
-   Types: `mention`, `comment_reply`, `new_post` (extensible via filter)

**REST Endpoint:** `GET /wp-json/p2026/v1/notifications?unread_only=true&limit=20`

-   Returns user's notifications, newest first
-   `unread_only` filters to unread count
-   Supports pagination via `offset`

**Notification Triggers:**

-   Create hooks in `p2026.php`:
    -   `p2026_notify_mention( $user_id, $post_id, $comment_id, $author_id )` — fired after @mention in post/comment body
    -   `p2026_notify_reply( $user_id, $comment_id, $parent_comment_id, $post_id )` — fired after comment reply
    -   `p2026_notify_new_post( $user_id, $post_id, $author_id )` — fired on post creation (optional)
-   Actions integrate with mentions module (reuse `p2026_mentions_found` hook)

**Mark as Read:** `POST /wp-json/p2026/v1/notifications/{id}/read`

### React Frontend (Module)

**NotificationDock Component:** `src/modules/notifications/NotificationDock.js`

-   Mounted in `frontend.js` after other components
-   Dock is a fixed/sticky panel (bottom-right, collapsible)
-   Shows unread count badge in corner
-   Click to expand → reveals list of notifications (20 most recent)
-   Scrollable, lazy-load older notifications on scroll
-   Click notification item → dismisses and navigates to source (post/comment)
-   Mark all as read button

**Real-time Updates:**

-   Poll `GET /wp-json/p2026/v1/notifications?limit=5` every 10s (when visible)
-   Use same backoff/visibility logic as post polling (from `startPolling()`)
-   Jitter: 8-12s to prevent synchronized requests
-   Optional: WebSocket upgrade in future (defer)

**Flash Notifications:**

-   On real-time poll, new high-priority notifications (mentions) trigger a toast/popup
-   Toast auto-dismisses after 5s
-   Toast click → scroll/focus source

**Store Integration:**

-   Add to `src/store/index.js`:
    -   `notifications: []`
    -   `unreadNotificationCount: 0`
    -   `notificationsLoading: false`
-   New actions: `fetchNotifications()`, `markAsRead(id)`, `markAllAsRead()` (async thunks)
-   Selectors: `getNotifications()`, `getUnreadCount()`

**Styling:** `src/modules/notifications/_notifications.scss`

-   Dock styling (position, colors, animations)
-   Notification item layout
-   Toast/popup animations

---

## Branching Strategy

All three features will be developed on a single feature branch for cohesion:

**Branch Name:** `features/search-read-notifications`

**Commits (logical grouping):**

1. `feat: add search REST endpoint and indexing`
2. `feat: add search UI component`
3. `feat: add read/unread tracking (backend)`
4. `feat: add unread badge and sync (frontend)`
5. `feat: add notifications module (backend)`
6. `feat: add notification dock and real-time polling (frontend)`
7. `docs: update CLAUDE.md with new module and search docs`

---

## Testing Checklist

### Search

-   [ ] Search input filters by post title + content
-   [ ] Search input filters by comment content
-   [ ] Results display in order (newest first)
-   [ ] Phrase search ("quoted terms") works
-   [ ] Results link and scroll to target
-   [ ] Permission: unpublished posts not searchable by guests
-   [ ] Performance: search with 1000+ posts completes in <500ms

### Read/Unread

-   [ ] Initial load shows correct unread count (posts newer than last_activity)
-   [ ] Badge count capped at 100
-   [ ] Count resets to 0 after sync
-   [ ] Last activity timestamp persists across sessions
-   [ ] Works correctly for logged-out users (no badge)

### Notifications (Module)

-   [ ] Dock appears on page load
-   [ ] @mentions trigger notification entry
-   [ ] Comment replies trigger notification
-   [ ] Notification click navigates to source
-   [ ] Mark as read works (local + server)
-   [ ] Polling respects visibility (no polling when tab hidden)
-   [ ] Performance: 100+ notifications load without lag
-   [ ] Module can be disabled via `p2026_active_modules` option

---

## Future Optimizations

1. **Search:** Add MySQL fulltext indexing or Elasticsearch integration
2. **Read State:** Optimize with transient caching or Redis
3. **Notifications:** WebSocket support for instant delivery (replace polling)
4. **Notifications:** Digest notifications (batch mentions/replies into daily email)

---

## Files to Create/Modify

**New Files:**

-   `includes/api/search.php`
-   `src/components/SearchWidget.js`
-   `src/components/UnreadBadge.js`
-   `modules/notifications/index.php`
-   `modules/notifications/README.md`
-   `src/modules/notifications/index.js`
-   `src/modules/notifications/NotificationDock.js`
-   `src/modules/notifications/NotificationItem.js`
-   `src/modules/notifications/useNotifications.js`
-   `src/modules/notifications/_notifications.scss`

**Modified Files:**

-   `p2026.php` (hooks for notifications, read-state updates)
-   `src/store/index.js` (new state, actions, selectors)
-   `src/frontend.js` (mount NotificationDock optionally)
-   `src/components/FeedEnhancer.js` (mount SearchWidget, integrate read-state sync)
-   `src/styles.scss` (@use notifications module)
-   `src/modules/index.js` (add notifications import)
-   `CLAUDE.md` (update module table, add new features to docs)

---

## Estimated Effort

-   **Search:** 2-3 days (backend REST + frontend UI + testing)
-   **Read/Unread:** 1-2 days (backend state + small UI component)
-   **Notifications (Module):** 2-3 days (backend hooks + dock component + polling)
-   **Documentation & Testing:** 1-2 days
-   **Total:** ~1-2 weeks at a steady pace

---
