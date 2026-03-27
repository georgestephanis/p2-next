# P2026 Module: Audit Log

Reviewed: March 27, 2026

Persists audit events emitted by other p2026 modules.

## Features

-   Listens for `p2026_audit_log_event` actions
-   Supports two storage backends:
    -   `file`: newline-delimited JSON (`.jsonl`) in uploads
    -   `cpt`: internal custom post type (`p2026_audit_event`)
-   Backend is configurable from the P2026 admin settings page

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

## Module Activation

Enabled by default. Disable by adding `audit-log` to the `p2026_disabled_modules` option (or via the P2026 settings page).
