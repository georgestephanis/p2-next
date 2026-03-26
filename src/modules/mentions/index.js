/**
 * P2026 Module: Mentions
 *
 * Adds @username mention support to the inline post and comment editors:
 *
 *   • Autocomplete popover triggered by typing "@" in any rich-text field.
 *   • Resolves usernames via GET /wp/v2/p2026/mentions/users?search={query}.
 *   • Wraps matched tokens in a `p2026/mention` rich-text format so they
 *     render as highlighted, linked spans on the frontend.
 *   • Notifications are handled server-side in modules/mentions/index.php.
 *
 * @todo Implement rich-text format registration (@wordpress/rich-text).
 * @todo Implement autocomplete UI (@wordpress/components Popover + user search).
 * @todo Register format type with registerFormatType().
 */

// Stub — no behaviour yet. Future implementation will import from here.
