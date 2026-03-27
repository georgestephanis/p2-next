# Mentions Module

Provides `@username` mention support for p2026. The module has three distinct layers that work together:

1. **Block Editor autocomplete** — `@` trigger inside any RichText field (paragraph, heading, etc.)
2. **Textarea autocomplete** — `MentionTextareaControl`, a drop-in replacement for `TextareaControl` used in comment forms
3. **Hovercards** — a floating profile card shown when hovering any `.p2026-mention` link on the page

All three are initialised automatically when `src/modules/index.js` imports this module.

---

## Files

| File | Purpose |
|---|---|
| `index.js` | Module entry point — registers the format type, Block Editor completer filter, and hovercard host |
| `MentionTextareaControl.js` | React component — textarea with `@mention` autocomplete for plain-text fields |
| `Hovercard.js` | React component + controller API — floating profile card anchored to mention links |
| `_mentions.scss` | All mention and hovercard styles (imported by `src/styles.scss`) |

---

## How It Works

### Format type: `p2026/mention`

A `@wordpress/rich-text` format type is registered under the name `p2026/mention`. It wraps mention text in:

```html
<span class="p2026-mention" data-user-id="42" data-user-slug="jane">@jane</span>
```

The format has no editor toolbar button. Autocomplete currently inserts plain `@slug` text; PHP parses and linkifies mentions on render. The format registration allows existing mention spans in editor content to be recognized and round-tripped.

### Block Editor autocomplete

An `editor.Autocomplete.completers` filter adds an `@` trigger to Gutenberg's built-in autocomplete system. When a user types `@` followed by at least one character inside any `RichText` field, the completer calls `GET /p2026/v1/users?search=<query>&per_page=5` and displays matching users.

Selecting a suggestion inserts `@slug` as plain text. The `isDebounced: true` flag delegates debouncing to `@wordpress/block-editor`.

Suggestions are only shown to logged-in users (`window.p2026Config.currentUser` must be set).

### Textarea autocomplete — `MentionTextareaControl`

A standalone React component for use outside the Block Editor (e.g. comment forms). It is visually identical to `@wordpress/components`'s `TextareaControl` but detects `@partial` tokens before the caret and shows a suggestion listbox below the textarea.

**Props:**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `string` | — | Controlled textarea value |
| `onChange` | `(string) => void` | — | Called with the new value on every change |
| `label` | `string` | — | Optional visible label |
| `hideLabelFromVision` | `boolean` | `false` | Applies visually hidden label style |
| `placeholder` | `string` | — | Textarea placeholder |
| `rows` | `number` | `4` | Visible row count |
| `disabled` | `boolean` | `false` | Disables the textarea |

**Keyboard navigation:**

| Key | Action |
|---|---|
| `ArrowDown` / `ArrowUp` | Move active suggestion |
| `Enter` / `Tab` | Accept active suggestion |
| `Escape` | Dismiss suggestion list |

Accepting a suggestion replaces the `@partial` token with `@slug ` (trailing space included) and restores focus to the textarea.

For guests (`window.p2026Config.currentUser` absent), the component behaves exactly like a plain `TextareaControl` — no fetch is made and no suggestion list is shown.

The component generates per-instance textarea/listbox/option IDs, so multiple open forms do not conflict in ARIA relationships.

**Usage:**

```jsx
import MentionTextareaControl from '../modules/mentions/MentionTextareaControl';

<MentionTextareaControl
    label="Comment"
    value={ text }
    onChange={ setText }
    placeholder="Write a comment…"
    rows={ 3 }
/>
```

### Hovercards

A single `HovercardHost` component is mounted once to a portal `<div id="p2026-hovercard-root">` appended to `document.body`. Event delegation on `document` listens for `mouseover`/`mouseout` events on any `a.p2026-mention[data-user-id]` element, whether rendered by the PHP theme loop or injected by React.

**Show/hide flow:**

1. Hovering a mention link schedules a show after 300 ms (`scheduleShow`).
2. If the pointer leaves before the timer fires, the show is cancelled.
3. On show, `GET /p2026/v1/users/<id>` fetches full profile data (results are cached in memory for the page lifetime).
4. The card positions itself below the anchor, then adjusts to stay within the viewport (flips above if there is not enough room below, clamps the right edge).
5. Moving the pointer into the card cancels the hide timer so the card stays open.
6. Leaving both the card and the anchor schedules a hide after 200 ms (`scheduleHide`).

Hovercards are only mounted for logged-in users (the detail endpoint requires authentication).

**Programmatic control:**

`index.js` exposes two functions from `Hovercard.js` for use by non-React code:

```js
import { showHovercard, hideHovercard } from './Hovercard';

// Show a card anchored to an element.
showHovercard( user, anchorElement );

// { id, slug, name, bio, avatar_url, profile_url, post_count }

// Hide the card.
hideHovercard();
```

Both are no-ops until `HovercardHost` has mounted and registered its controller.

---

## REST Endpoints

| Method | Path | Auth required | Used by |
|---|---|---|---|
| `GET` | `/p2026/v1/users?search=<q>&per_page=5` | Yes | Autocomplete (both Block Editor and textarea) |
| `GET` | `/p2026/v1/users/<id>` | Yes | Hovercard profile fetch |

---

## Styles

All styles live in `_mentions.scss` (a Sass partial imported at the top of `src/styles.scss`).

| Selector | Purpose |
|---|---|
| `.p2026-mention` | Inline mention token styling (blue, medium weight) |
| `.p2026-mention-textarea-wrap` | Relative-positioned wrapper enabling the suggestion list |
| `.p2026-mention-suggestions` | Autocomplete suggestion listbox |
| `.p2026-mention-suggestions__item` | Individual suggestion row |
| `.p2026-mention-suggestions__name` | Display name within a suggestion row |
| `.p2026-mention-suggestions__slug` | `@username` within a suggestion row |
| `.p2026-hovercard` | Floating card container (`position: fixed` is set inline) |
| `.p2026-hovercard__header` | Avatar + identity row |
| `.p2026-hovercard__avatar` | Circular avatar image |
| `.p2026-hovercard__identity` | Name + slug wrapper |
| `.p2026-hovercard__name` | Display name in the card |
| `.p2026-hovercard__slug` | `@username` in the card |
| `.p2026-hovercard__bio` | Optional bio paragraph |
| `.p2026-hovercard__meta` | Post count line |
| `.p2026-hovercard__link` | "View profile →" link |
