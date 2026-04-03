# P2026 Module: Audit Log

Reviewed: April 3, 2026

Persists audit events emitted by other p2026 modules and provides an admin browser for viewing events.

## Features

-   Listens for `p2026_audit_log_event` actions
-   Supports two storage backends:
    -   `file`: newline-delimited JSON (`.jsonl`) in uploads
    -   `cpt`: internal custom post type (`p2026_audit_event`)
-   Backend is configurable from the P2026 admin settings page
-   Admin Audit Log tab includes a DataViews-powered browser with:
	-   day selection
	-   client-side filtering/sorting/pagination
	-   related actor/post/comment enrichment
	-   mention hovercards and link previews in table cells

## Hook Contract

The module listens to:

```php
do_action( 'p2026_audit_log_event', $event_type, $payload );
```

Expected values:

-   `$event_type` (string): event slug such as `post_state_changed`
-   `$payload` (array): event metadata

Example payload from the post-state module:

```json
{
	"version": 1,
	"post_id": 123,
	"old_state": "normal",
	"new_state": "unresolved",
	"actor_id": 7,
	"timestamp": "2026-03-27T12:34:56+00:00",
	"source": "menu",
	"context": {
		"transport": "rest"
	}
}
```

## Backends

### File backend (`file`)

-   Path: `{wp_upload_dir().basedir}/p2026-audit-log.jsonl`
-   Format: one JSON object per line
-   Rotation: rotates file when size exceeds 5 MB, with timestamped `.bak` suffix

### CPT backend (`cpt`)

-   Registers post type `p2026_audit_event`
-   Stores each event as a private post
-   Writes key fields to post meta for filtering/reporting

## Configuration

Option key:

-   `p2026_audit_log_backend` (`file` or `cpt`)

Defaults to `file`.

## Admin REST Endpoints

These routes are used by the Audit Log admin tab and require `manage_options`.

### `GET /wp-json/p2026/v1/audit-log/days`

Returns available day shards and backend type:

```json
{
	"days": ["2026-04-03", "2026-04-02"],
	"backend": "file"
}
```

### `GET /wp-json/p2026/v1/audit-log/entries`

Query parameters:

-   `day` (optional, `YYYY-MM-DD`)
-   `page` (default `1`)
-   `per_page` (default `200`, max `500`)

Response body is an array of entries. Pagination totals are provided in headers:

-   `X-WP-Total`
-   `X-WP-TotalPages`

Entry shape includes:

-   `id`
-   `day`
-   `timestamp`
-   `event_type`
-   `post_id`
-   `comment_id`
-   `actor_id`
-   `old_state`
-   `new_state`
-   `source`
-   `context`
-   `payload`

## Frontend/Admin Files

-   PHP module: `modules/audit-log/index.php`
-   Admin app: `src/modules/audit-log/audit-log-viewer.js`
-   Admin styles: `src/modules/audit-log/audit-log-viewer.scss`

## Module Activation

Enabled by default. Disable by adding `audit-log` to the `p2026_disabled_modules` option (or via the P2026 settings page).
