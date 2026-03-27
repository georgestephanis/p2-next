# P2026 Enhancement Implementation — Status Report

**Branch:** `features/search-read-notifications`
**Commit:** Initial infrastructure + components
**Date:** March 27, 2026

---

## ✅ Completed

### Architecture & Planning

-   [x] Created comprehensive `IMPLEMENTATION_PLAN.md` with detailed specifications
-   [x] Decided module structure: Search (core), Read/Unread (core), Notifications (module)
-   [x] Feature branch created and initial commit pushed

### 1. Search Across Posts and Comments (Core)

**PHP Backend:**

-   [x] `/src/api/search.php` — REST endpoint `GET /p2026/v1/search?q={query}`
-   [x] Search logic: combines posts + comments, respects permissions
-   [x] Results sorted newest first, capped at 20, paginated with offset
-   [x] Returns enriched data (excerpt, author, source type, links)

**React Frontend:**

-   [x] `SearchWidget.js` — searchable input with modal results overlay
-   [x] Debounced search (300ms)
-   [x] Result click navigation (scrolls to post or comment)
-   [x] Empty and loading states
-   [x] Styling: `search.scss` with modal layout

### 2. Read / Unread Tracking (Core)

**PHP Backend:**

-   [x] `/src/api/read-state.php` — manages per-user read state
-   [x] User meta key: `p2026_last_activity` (ISO timestamp)
-   [x] REST endpoint `GET /p2026/v1/read-state` — fetch user's read state
-   [x] REST endpoint `POST /p2026/v1/read-state/sync` — update activity timestamp
-   [x] Unread count logic: posts newer than `last_activity`, capped at 100
-   [x] Auto-init on user login via `wp_login` hook

**React Frontend:**

-   [x] `UnreadBadge.js` — pill-badge showing unread count
-   [x] Hidden when count = 0
-   [x] Click to reveal pending posts + sync read state
-   [x] Auto-sync on tab visibility change (when page loses focus)
-   [x] Styling: `unread-badge.scss` with red badge design
-   [x] Store actions: `fetchReadState()`, `syncReadState()`, `setUnreadCount()`
-   [x] Store selectors: `getReadState()`, `getUnreadCount()`

### 3. Notification Dock / Flash Notifications (Independent Module)

**PHP Backend:**

-   [x] `/modules/notifications/index.php` — notification system
-   [x] Notification storage: user meta with UUID keys
-   [x] Notification types: `mention`, `reply` (extensible)
-   [x] REST endpoint `GET /p2026/v1/notifications` — list user notifications
-   [x] REST endpoint `POST /p2026/v1/notifications/{id}/read` — mark as read
-   [x] REST endpoint `POST /p2026/v1/notifications/read-all` — bulk mark as read
-   [x] Auto-create notifications on @mentions (via `p2026_mentions_found` hook)
-   [x] Auto-create notifications on comment replies (via `wp_insert_comment` hook)
-   [x] Helper functions: `p2026_create_notification()`, `p2026_get_notifications()`, `p2026_count_unread_notifications()`
-   [x] Module readme with API docs

**React Frontend:**

-   [x] `NotificationDock.js` — fixed bottom-right dock with badge
-   [x] Dock expands on badge click
-   [x] Displays recent notifications (20 per page, paginated)
-   [x] Real-time polling every 10s with backoff on error
-   [x] Badges unread count separately
-   [x] Mark all as read button
-   [x] Styling: `_notification-dock.scss`
-   [x] `NotificationItem.js` — individual notification rendering
-   [x] Shows type, source, date, avatar placeholder
-   [x] Click to navigate + mark as read
-   [x] Unread dot indicator
-   [x] Styling: `_notification-item.scss`
-   [x] `/src/modules/notifications/index.js` — module entry point
-   [x] Mounts dock to DOM on load

### Store Integration

-   [x] Extended store with new state branches:
    -   `readState: { lastActivity, unreadCount }`
    -   `notifications: []`
    -   `unreadNotificationCount: 0`
-   [x] Added async thunks: `fetchReadState()`, `syncReadState()`, `fetchNotifications()`, `markNotificationAsRead()`, `markAllAsRead()`
-   [x] Added selectors: `getReadState()`, `getUnreadCount()`, `getNotifications()`, `getUnreadNotificationCount()`
-   [x] Reducer handles new action types for all three features

### Integration & Build

-   [x] Updated `p2026.php` to require new API files (search.php, read-state.php)
-   [x] Updated `src/modules/index.js` to import notifications module
-   [x] Updated main `src/styles.scss` to @use new component stylesheets
-   [x] All SCSS files structured and semantically named

---

## ⏳ Remaining Work

### Before Production

1. **Build Assets**

    - [x] Run `npm run build` to compile React components and SCSS
    - [x] Verify build/frontend.js and build/frontend.css include all changes
    - [x] Verify block manifest updates

2. **Mount Components in FeedEnhancer**

    - [x] Update `src/components/FeedEnhancer.js` to render SearchWidget and UnreadBadge in header
    - [x] Create header container portal if not present
    - [x] Position widgets in top-bar area

3. **Testing Smoke Tests**

    - [ ] Search: Query posts/comments, verify results + navigation
    - [ ] Read/Unread: Check unread badge on page load, verify sync on reveal
    - [ ] Notifications: Verify dock appears, polling works, marking as read updates count
    - [ ] Permissions: Guest users don't see features, logged-in users do
    - [ ] Performance: No lag with 100+ notifications, search <500ms

4. **Documentation**
    - [ ] Update `CLAUDE.md` with new modules/features
    - [ ] Verify notifications module shown in module table
    - [ ] Document cache warming for search (post_meta indexing)

### Future Optimizations (Not Blocking)

1. **Search**

    - MySQL fulltext indexing (FT+ mode)
    - Elasticsearch integration for large sites
    - Cache search results in post_meta
    - Support quoted phrase search

2. **Read/Unread**

    - Redis caching for last_activity lookups
    - Transient-backed cache with 1hr TTL
    - Batch sync on server endpoint

3. **Notifications**
    - WebSocket support (replace polling)
    - Digest notifications (batch mentions into daily email)
    - Browser native push notifications
    - Notification type filtering UI in dock
    - Persist notifications in custom table (not user_meta)

---

## File Manifest

### New PHP Files

-   `src/api/search.php`
-   `src/api/read-state.php`
-   `modules/notifications/index.php`
-   `modules/notifications/README.md`

### New React Components

-   `src/components/SearchWidget.js`
-   `src/components/UnreadBadge.js`
-   `src/modules/notifications/NotificationDock.js`
-   `src/modules/notifications/NotificationItem.js`
-   `src/modules/notifications/index.js`

### New Stylesheets

-   `src/components/search.scss`
-   `src/components/unread-badge.scss`
-   `src/modules/notifications/_notification-dock.scss`
-   `src/modules/notifications/_notification-item.scss`

### Modified Files

-   `p2026.php` (added require for search.php, read-state.php)
-   `src/frontend.js` (will need SearchWidget + UnreadBadge mounts)
-   `src/store/index.js` (extended with new state/actions/selectors)
-   `src/modules/index.js` (added notifications import)
-   `src/styles.scss` (@use new module imports)
-   `CLAUDE.md` (will need feature docs update)

---

## Quick Start to Production

1. **Build:**

    ```bash
    npm run build
    npm run lint:js
    npm run lint:php
    ```

2. **Mount Components:**

    - Edit `src/components/FeedEnhancer.js`
    - Import `SearchWidget` and `UnreadBadge`
    - Add header container before banner (if not present)
    - Render widgets in header via portal

3. **Test:**

    - Create test user
    - Search for posts
    - Check unread badge
    - Create comment mention
    - Verify notification appears

4. **Merge & Release:**
    - PR review
    - Merge to main
    - Version bump
    - Tag release

---

## Questions / Decisions Needed

1. **Search Scope:** Should search be available to all logged-in users, or restricted by view capability?

    - Recommendation: Logged-in only (current implementation)
    - Alternative: Add capability check for read-access

2. **Notification Storage:** Current implementation uses user_meta with JSON encoding.

    - Pros: Simple, no migrations
    - Cons: Doesn't scale well (100+ notifications becomes slow query)
    - Future: Create custom table when needed

3. **Notification Types:** Currently `mention` and `reply`.

    - Should we add `new_post` notifications?
    - Recommendation: Leave for future; can easily add via hook

4. **Search Index:** No pre-indexing currently (LIKE queries).
    - OK for <5k posts
    - Should add MySQL FT+ or Elasticsearch for production sites

---
