<?php
/**
 * P2026 Module: Audit Log
 *
 * Module Name:        Audit Log
 * Module Description: Persists core audit events to a log file or custom post type.
 * Module Version:     0.1.0
 *
 * @package P2026\Modules\AuditLog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const P2026_AUDIT_LOG_BACKEND_OPTION = 'p2026_audit_log_backend';

/**
 * Return configured audit backend.
 *
 * @return string
 */
function p2026_audit_log_get_backend() {
	$backend = get_option( P2026_AUDIT_LOG_BACKEND_OPTION, 'file' );
	$backend = is_string( $backend ) ? sanitize_key( $backend ) : 'file';
	return in_array( $backend, array( 'file', 'cpt' ), true ) ? $backend : 'file';
}

/**
 * Register internal custom post type used by the CPT backend.
 */
function p2026_audit_log_register_post_type() {
	register_post_type(
		'p2026_audit_event',
		array(
			'labels'              => array(
				'name'          => __( 'Audit Events', 'p2026' ),
				'singular_name' => __( 'Audit Event', 'p2026' ),
			),
			'public'              => false,
			'show_ui'             => current_user_can( 'manage_options' ),
			'show_in_menu'        => true,
			'show_in_admin_bar'   => false,
			'show_in_rest'        => false,
			'capability_type'     => 'post',
			'map_meta_cap'        => true,
			'supports'            => array( 'title', 'editor' ),
			'exclude_from_search' => true,
			'publicly_queryable'  => false,
			'rewrite'             => false,
		)
	);
}
add_action( 'init', 'p2026_audit_log_register_post_type' );

/**
 * Persist incoming audit events.
 *
 * @param string $event_type Event type slug.
 * @param array  $payload    Event payload.
 */
function p2026_audit_log_handle_event( $event_type, $payload ) {
	if ( ! is_array( $payload ) ) {
		return;
	}

	$backend = p2026_audit_log_get_backend();
	if ( 'cpt' === $backend ) {
		p2026_audit_log_write_cpt( $event_type, $payload );
		return;
	}

	p2026_audit_log_write_file( $event_type, $payload );
}
add_action( 'p2026_audit_log_event', 'p2026_audit_log_handle_event', 10, 2 );

/**
 * Write an audit entry to uploads JSONL.
 *
 * @param string $event_type Event type slug.
 * @param array  $payload    Event payload.
 */
function p2026_audit_log_write_file( $event_type, $payload ) {
	$upload_dir = wp_upload_dir();
	if ( ! empty( $upload_dir['error'] ) ) {
		return;
	}

	$log_path = trailingslashit( $upload_dir['basedir'] ) . 'p2026-audit-log.jsonl';
	$entry    = wp_json_encode(
		array(
			'event_type' => sanitize_key( (string) $event_type ),
			'payload'    => $payload,
		)
	);

	if ( false === $entry ) {
		return;
	}

	$handle = fopen( $log_path, 'ab' );
	if ( ! $handle ) {
		error_log( sprintf( 'p2026 audit log: failed to open log file "%s" with mode "ab".', $log_path ) );
		return;
	}

	if ( flock( $handle, LOCK_EX ) ) {
		fwrite( $handle, $entry . PHP_EOL );
		flock( $handle, LOCK_UN );
	}

	fclose( $handle );

	$max_size = 5 * 1024 * 1024;
	if ( file_exists( $log_path ) && filesize( $log_path ) > $max_size ) {
		$rotated = $log_path . '.' . gmdate( 'Ymd-His' ) . '.bak';
		if ( ! @rename( $log_path, $rotated ) ) {
			error_log( sprintf( 'p2026 audit log rotation failed from %s to %s', $log_path, $rotated ) );
		}
	}
}

/**
 * Write an audit entry to the custom post type backend.
 *
 * @param string $event_type Event type slug.
 * @param array  $payload    Event payload.
 */
function p2026_audit_log_write_cpt( $event_type, $payload ) {
	$post_id = (int) ( $payload['post_id'] ?? 0 );
	$title   = sprintf(
		/* translators: 1: event type, 2: post id */
		__( '%1$s: Post %2$d', 'p2026' ),
		sanitize_key( (string) $event_type ),
		$post_id
	);

	$audit_post_id = wp_insert_post(
		array(
			'post_type'    => 'p2026_audit_event',
			'post_status'  => 'private',
			'post_title'   => $title,
			'post_content' => wp_json_encode( $payload, JSON_PRETTY_PRINT ),
		),
		true
	);

	if ( is_wp_error( $audit_post_id ) || ! $audit_post_id ) {
		return;
	}

	update_post_meta( $audit_post_id, 'p2026_audit_event_type', sanitize_key( (string) $event_type ) );
	update_post_meta( $audit_post_id, 'p2026_audit_post_id', $post_id );
	update_post_meta( $audit_post_id, 'p2026_audit_actor_id', (int) ( $payload['actor_id'] ?? 0 ) );
	update_post_meta( $audit_post_id, 'p2026_audit_old_state', sanitize_key( (string) ( $payload['old_state'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_new_state', sanitize_key( (string) ( $payload['new_state'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_timestamp', sanitize_text_field( (string) ( $payload['timestamp'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_source', sanitize_key( (string) ( $payload['source'] ?? '' ) ) );
}
