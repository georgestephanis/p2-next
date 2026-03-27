# Per-Post Read/Unread Tracking

## Overview

Add granular per-post read/unread state to complement the existing global `lastActivity` timestamp. This allows users to manually flag individual posts as unread and have them re-appear in their unread count, enabling intentional archival and re-surfacing of content.

## Current State

The existing system tracks only a **global** `lastActivity` timestamp:
- Stored in user_meta as `p2026_last_activity` (ISO 8601 string)
- Any post created **after** this timestamp is unread
- Clicking the unread badge reveals pending posts and syncs `lastActivity` to now
- No way to manually mark a post as unread after it's been revealed

## Proposed Feature

Allow users to toggle individual posts as read/unread via a menu action in `PostEnhancement.js`.

### User Experience

1. **New Menu Item:** "Mark as unread" appears in the three-dot menu when a post is currently marked as read
2. **Action:** Clicking toggles the post's state and updates the unread badge count
3. **Visual Feedback:** Post might receive a subtle visual indicator (e.g., highlight, icon) when marked unread
4. **Persistence:** State persists across page reloads via REST API

### Data Model

#### Backend Storage

**Option A: User Meta Array (Recommended)**
```
user_meta key: p2026_marked_unread_posts
value: JSON-encoded array of post IDs
Example: [1245, 1248, 1251]
```
Pros: Simple, efficient queries, scales to hundreds of posts
Cons: Need to manage array mutations carefully

**Option B: Individual Meta Entries**
```
user_meta key pattern: p2026_post_{post_id}_unread
value: "1" (marked unread) or absent (read)
```
Pros: Atomic updates, no array coordination
Cons: Creates many meta rows, slower range queries

**Recommendation:** Use Option A with a JSON array, capped at ~5000 posts for performance.

#### REST Endpoint

New endpoint to manage per-post read state:
```
POST /p2026/v1/posts/{post_id}/read-state
Body: { "marked_unread": true|false }

GET /p2026/v1/posts/read-state
Response: { "marked_unread_ids": [1245, 1248, ...], "lastActivity": "..." }
```

### Store Integration

#### New State
```javascript
// In src/store/index.js
ui: {
  ...existing...
  markedUnreadPosts: [], // post IDs manually marked unread
}
```

#### New Actions
```javascript
// Action creators:
markPostUnread(postId)       // Toggle a post as unread
syncMarkedUnreadPosts(ids)   // Sync from backend

// Thunks:
togglePostReadState(postId)  // POST to endpoint + update store
```

#### New Selectors
```javascript
isPostMarkedUnread(select, postId)
getMarkedUnreadPosts(select)
getEffectiveUnreadCount(select)  // lastActivity-based + marked unread
```

### Frontend Implementation

#### PostEnhancement Menu
Add a new menu item in `PostEnhancement.js`:
```javascript
const isMarkedUnread = useSelect(s => s(STORE_NAME).isPostMarkedUnread(postId));
const { togglePostReadState } = useDispatch(STORE_NAME);

const onToggleReadState = useCallback(async () => {
  closeMenu();
  await togglePostReadState(postId);
}, [postId, togglePostReadState, closeMenu]);

// In menu rendering:
{!isEditing && (
  <li role="none">
    <button
      type="button"
      role="menuitem"
      className="p2026-menu-item"
      onClick={onToggleReadState}
    >
      {isMarkedUnread 
        ? __('Mark as read', 'p2026')
        : __('Mark as unread', 'p2026')
      }
    </button>
  </li>
)}
```

#### Unread Badge Update
Update `UnreadBadge.js` to show combined count:
```javascript
const unreadCount = useSelect(s => {
  const lastActivity = s(STORE_NAME).getReadState().lastActivity;
  const markedUnread = s(STORE_NAME).getMarkedUnreadPosts();
  return lastActivity ? /* count logic */ : 0;
});
```

#### Visual Indicator (Optional)
Add a subtle unread dot or icon to posts marked unread:
```scss
.p2026-post--marked-unread::before {
  content: '';
  position: absolute;
  width: 3px;
  height: 100%;
  left: 0;
  top: 0;
  background: currentColor;
  opacity: 0.5;
}
```

### Lifecycle & Initialization

1. On mount (FeedEnhancer), fetch marked unread posts list from `/p2026/v1/posts/read-state`
2. Store in Redux under `ui.markedUnreadPosts`
3. On any toggle, optimistically update UI + POST to backend
4. Handle conflicts: if server rejects, revert local state

### Edge Cases & Considerations

1. **Performance:** Marking 1000s of posts unread could degrade unread count calculation. Cache effectively.
2. **Cleanup:** Should marked-unread posts ever auto-expire? (e.g., if older than 30 days)
3. **Interactions with Pending Posts:** If a post is in the pending buffer and then marked unread, ensure it doesn't disappear.
4. **Admin Actions:** Consider tools for bulk unmarking or viewing marked unread in admin.
5. **API Limits:** Cap the number of marked-unread posts per user (e.g., max 5000).

### Testing Checklist

- [ ] Toggle unread for a single post
- [ ] Verify unread count updates correctly
- [ ] Verify state persists across page reload
- [ ] Mark unread a post older than `lastActivity`
- [ ] Unmark a post from the menu
- [ ] Test with many marked posts (100+)
- [ ] Verify marked unread posts appear in pending banner
- [ ] Sync behavior when switching tabs

### Implementation Priority

1. **Phase 1 (Core):** Backend endpoint + store + menu item
2. **Phase 2 (Polish):** Visual indicator, unread badge integration
3. **Phase 3 (Admin):** Admin UI to manage per-user state

### Backward Compatibility

- Existing `lastActivity` logic remains unchanged
- New `marked_unread_posts` meta is independent and optional
- No migration needed for existing users
