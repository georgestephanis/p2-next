<?php
/**
 * P2026 Module: Audit Log
 *
 * Module Name:        Audit Log
 * Module Description: Persists core audit events to a log file or custom post type.
 * Module Version:     0.4.0
 *
 * @package P2026\Modules\AuditLog
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const P2026_AUDIT_LOG_BACKEND_OPTION = 'p2026_audit_log_backend';
const P2026_AUDIT_LOG_ACTOR_TAXONOMY = 'p2026_audit_actor';
const P2026_AUDIT_LOG_EVENT_TYPE_TAXONOMY = 'p2026_audit_event_type';

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
			'show_ui'             => false,
			'show_in_menu'        => false,
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

	register_taxonomy(
		P2026_AUDIT_LOG_ACTOR_TAXONOMY,
		array( 'p2026_audit_event' ),
		array(
			'labels'            => array(
				'name'          => __( 'Audit Actors', 'p2026' ),
				'singular_name' => __( 'Audit Actor', 'p2026' ),
			),
			'public'            => false,
			'show_ui'           => false,
			'show_admin_column' => false,
			'show_in_menu'      => false,
			'show_tagcloud'     => false,
			'show_in_quick_edit'=> false,
			'show_in_rest'      => false,
			'hierarchical'      => false,
			'rewrite'           => false,
			'query_var'         => false,
		)
	);

	register_taxonomy(
		P2026_AUDIT_LOG_EVENT_TYPE_TAXONOMY,
		array( 'p2026_audit_event' ),
		array(
			'labels'            => array(
				'name'          => __( 'Audit Event Types', 'p2026' ),
				'singular_name' => __( 'Audit Event Type', 'p2026' ),
			),
			'public'            => false,
			'show_ui'           => false,
			'show_admin_column' => false,
			'show_in_menu'      => false,
			'show_tagcloud'     => false,
			'show_in_quick_edit'=> false,
			'show_in_rest'      => false,
			'hierarchical'      => false,
			'rewrite'           => false,
			'query_var'         => false,
		)
	);
}
add_action( 'init', 'p2026_audit_log_register_post_type' );

/**
 * Return a term ID for the provided taxonomy/slug, creating it if needed.
 *
 * @param string $taxonomy Taxonomy name.
 * @param string $slug     Stable term slug.
 * @param string $name     Human-readable term name.
 * @return int
 */
function p2026_audit_log_get_or_create_term_id( $taxonomy, $slug, $name ) {
	$taxonomy = sanitize_key( (string) $taxonomy );
	$slug     = sanitize_title( (string) $slug );
	$name     = sanitize_text_field( (string) $name );

	if ( '' === $taxonomy || '' === $slug || '' === $name || ! taxonomy_exists( $taxonomy ) ) {
		return 0;
	}

	$existing = get_term_by( 'slug', $slug, $taxonomy );
	if ( $existing instanceof WP_Term ) {
		return (int) $existing->term_id;
	}

	$inserted = wp_insert_term(
		$name,
		$taxonomy,
		array(
			'slug' => $slug,
		)
	);

	if ( is_wp_error( $inserted ) ) {
		$term_exists = term_exists( $slug, $taxonomy );
		if ( is_array( $term_exists ) && isset( $term_exists['term_id'] ) ) {
			return (int) $term_exists['term_id'];
		}

		if ( is_numeric( $term_exists ) ) {
			return (int) $term_exists;
		}

		return 0;
	}

	return isset( $inserted['term_id'] ) ? (int) $inserted['term_id'] : 0;
}

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
 * Emit an audit event for comment changes.
 *
 * @param string     $event_type Event type slug.
 * @param WP_Comment $comment    Comment object.
 * @param array      $context    Optional context metadata.
 * @return void
 */
function p2026_audit_log_emit_comment_event( $event_type, $comment, $context = array() ) {
	if ( ! $comment instanceof WP_Comment ) {
		return;
	}

	$payload = array(
		'version' => 1,
		'post_id' => (int) $comment->comment_post_ID,
		'comment_id' => (int) $comment->comment_ID,
		'actor_id' => get_current_user_id(),
		'timestamp' => current_time( 'c' ),
		'source' => sanitize_key( (string) $event_type ),
		'context' => is_array( $context ) ? $context : array(),
	);

	do_action( 'p2026_audit_log_event', sanitize_key( (string) $event_type ), $payload );
}

/**
 * Log comment creation events.
 *
 * @param int $comment_id Comment ID.
 * @return void
 */
function p2026_audit_log_on_comment_post( $comment_id ) {
	$comment = get_comment( (int) $comment_id );
	if ( ! $comment instanceof WP_Comment ) {
		return;
	}

	p2026_audit_log_emit_comment_event( 'comment_created', $comment, array( 'transport' => 'comment_post' ) );
}
add_action( 'comment_post', 'p2026_audit_log_on_comment_post', 10, 1 );

/**
 * Log comment update events.
 *
 * @param int $comment_id Comment ID.
 * @return void
 */
function p2026_audit_log_on_edit_comment( $comment_id ) {
	$comment = get_comment( (int) $comment_id );
	if ( ! $comment instanceof WP_Comment ) {
		return;
	}

	p2026_audit_log_emit_comment_event( 'comment_updated', $comment, array( 'transport' => 'edit_comment' ) );
}
add_action( 'edit_comment', 'p2026_audit_log_on_edit_comment', 10, 1 );

/**
 * Log comment status transition events.
 *
 * @param string $new_status New status.
 * @param string $old_status Previous status.
 * @param object $comment    Comment object.
 * @return void
 */
function p2026_audit_log_on_comment_status_transition( $new_status, $old_status, $comment ) {
	if ( ! $comment instanceof WP_Comment || $new_status === $old_status ) {
		return;
	}

	p2026_audit_log_emit_comment_event(
		'comment_status_changed',
		$comment,
		array(
			'old_status' => sanitize_key( (string) $old_status ),
			'new_status' => sanitize_key( (string) $new_status ),
			'transport' => 'transition_comment_status',
		)
	);
}
add_action( 'transition_comment_status', 'p2026_audit_log_on_comment_status_transition', 10, 3 );

/**
 * Register Audit Log tab on the shared P2026 settings screen.
 *
 * @param array<string, string> $tabs Existing settings tabs.
 * @return array<string, string>
 */
function p2026_audit_log_register_settings_tab( $tabs ) {
	if ( ! is_array( $tabs ) ) {
		$tabs = array();
	}

	$tabs['audit-log'] = __( 'Audit Log', 'p2026' );
	return $tabs;
}
add_filter( 'p2026_settings_tabs', 'p2026_audit_log_register_settings_tab' );

/**
 * Save Audit Log tab settings.
 */
function p2026_audit_log_save_settings_tab() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$nonce = isset( $_POST['p2026_audit_log_settings_nonce'] )
		? sanitize_text_field( wp_unslash( $_POST['p2026_audit_log_settings_nonce'] ) )
		: '';
	if ( ! wp_verify_nonce( $nonce, 'p2026_audit_log_settings_save' ) ) {
		return;
	}

	$backend = isset( $_POST['p2026_audit_log_backend'] )
		? sanitize_key( wp_unslash( $_POST['p2026_audit_log_backend'] ) )
		: 'file';

	if ( ! in_array( $backend, array( 'file', 'cpt' ), true ) ) {
		$backend = 'file';
	}

	update_option( P2026_AUDIT_LOG_BACKEND_OPTION, $backend );
}
add_action( 'p2026_settings_save_tab_audit-log', 'p2026_audit_log_save_settings_tab' );

/**
 * Render Audit Log tab settings.
 */
function p2026_audit_log_render_settings_tab() {
	$audit_backend = p2026_audit_log_get_backend();
	?>
	<?php wp_nonce_field( 'p2026_audit_log_settings_save', 'p2026_audit_log_settings_nonce' ); ?>
	<h2 class="title"><?php esc_html_e( 'Audit Log', 'p2026' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'Choose where audit events are persisted when the Audit Log module is enabled.', 'p2026' ); ?>
	</p>
	<table class="form-table" role="presentation">
		<tr>
			<th scope="row">
				<label for="p2026_audit_log_backend"><?php esc_html_e( 'Audit backend', 'p2026' ); ?></label>
			</th>
			<td>
				<select id="p2026_audit_log_backend" name="p2026_audit_log_backend">
					<option value="file" <?php selected( 'file', $audit_backend ); ?>><?php esc_html_e( 'Uploads file (JSONL)', 'p2026' ); ?></option>
					<option value="cpt" <?php selected( 'cpt', $audit_backend ); ?>><?php esc_html_e( 'Custom post type', 'p2026' ); ?></option>
				</select>
				<p class="description">
					<?php esc_html_e( 'File backend appends newline-delimited JSON in uploads. CPT backend stores each event as an internal post.', 'p2026' ); ?>
				</p>
			</td>
		</tr>
	</table>

	<?php submit_button( __( 'Save Changes', 'p2026' ), 'primary', 'p2026_save_settings', false ); ?>

	<hr />
	<h2 class="title"><?php esc_html_e( 'Audit Entries', 'p2026' ); ?></h2>
	<p class="description">
		<?php esc_html_e( 'Browse captured audit events with sorting, filtering, and per-day selection.', 'p2026' ); ?>
	</p>
	<div id="p2026-audit-log-viewer-root"></div>
	<?php
}
add_action( 'p2026_settings_render_tab_audit-log', 'p2026_audit_log_render_settings_tab' );

/**
 * Enqueue audit log DataViews app only on the Audit Log settings tab.
 *
 * @param string $hook_suffix Current admin page hook.
 * @return void
 */
function p2026_audit_log_enqueue_admin_assets( $hook_suffix ) {
	if ( 'toplevel_page_p2026-settings' !== $hook_suffix ) {
		return;
	}

	$tab = isset( $_GET['tab'] ) ? sanitize_key( wp_unslash( $_GET['tab'] ) ) : 'modules';
	if ( 'audit-log' !== $tab ) {
		return;
	}

	$asset_path = P2026_DIR . 'build/audit-log-viewer.asset.php';
	if ( ! file_exists( $asset_path ) ) {
		return;
	}

	$asset = require $asset_path;
	if ( ! is_array( $asset ) ) {
		return;
	}

	$preloaded_day = '';
	$preloaded_entries = array();
	$available_days = p2026_audit_log_get_available_days();
	if ( ! empty( $available_days ) ) {
		$preloaded_day = (string) $available_days[0];
		if ( 'cpt' === p2026_audit_log_get_backend() ) {
			$preloaded_entries = array_slice( p2026_audit_log_read_cpt_entries( $preloaded_day, 500 ), 0, 500 );
		} else {
			$preloaded_entries = array_slice( p2026_audit_log_read_file_entries( $preloaded_day ), 0, 500 );
		}
	}

	wp_enqueue_script(
		'p2026-audit-log-viewer',
		P2026_URL . 'build/audit-log-viewer.js',
		$asset['dependencies'] ?? array(),
		$asset['version'] ?? P2026_VERSION,
		true
	);

	$style_path = P2026_DIR . 'build/audit-log-viewer.css';
	if ( file_exists( $style_path ) ) {
		// DataViews styling can be registered under different core handles across WordPress versions.
		$style_dependencies = array( 'wp-components' );
		if ( wp_style_is( 'wp-dataviews', 'registered' ) ) {
			$style_dependencies[] = 'wp-dataviews';
		}
		if ( wp_style_is( 'wp-views', 'registered' ) ) {
			$style_dependencies[] = 'wp-views';
		}

		wp_enqueue_style(
			'p2026-audit-log-viewer',
			P2026_URL . 'build/audit-log-viewer.css',
			$style_dependencies,
			$asset['version'] ?? P2026_VERSION
		);
		wp_style_add_data( 'p2026-audit-log-viewer', 'rtl', 'replace' );
	}

	wp_add_inline_script(
		'p2026-audit-log-viewer',
		'window.p2026AuditLogConfig = ' . wp_json_encode(
			array(
				'restBase' => esc_url_raw( rest_url( 'p2026/v1/audit-log' ) ),
				'restRoot' => esc_url_raw( rest_url() ),
				'restNonce' => wp_create_nonce( 'wp_rest' ),
				'backend' => p2026_audit_log_get_backend(),
				'preloadedDay' => $preloaded_day,
				'preloadedEntries' => array_values( $preloaded_entries ),
			)
		) . ';',
		'before'
	);
}
add_action( 'admin_enqueue_scripts', 'p2026_audit_log_enqueue_admin_assets' );

/**
 * Register Audit Log admin REST routes.
 */
function p2026_audit_log_register_rest_routes() {
	register_rest_route(
		'p2026/v1',
		'/audit-log/days',
		array(
			'methods' => WP_REST_Server::READABLE,
			'callback' => 'p2026_audit_log_rest_days',
			'permission_callback' => static function () {
				return current_user_can( 'manage_options' );
			},
		)
	);

	register_rest_route(
		'p2026/v1',
		'/audit-log/entries',
		array(
			'methods' => WP_REST_Server::READABLE,
			'callback' => 'p2026_audit_log_rest_entries',
			'permission_callback' => static function () {
				return current_user_can( 'manage_options' );
			},
			'args' => array(
				'day' => array(
					'type' => 'string',
					'required' => false,
				),
				'page' => array(
					'type' => 'integer',
					'default' => 1,
				),
				'per_page' => array(
					'type' => 'integer',
					'default' => 200,
				),
			),
		)
	);
}
add_action( 'rest_api_init', 'p2026_audit_log_register_rest_routes' );

/**
 * Return normalized list of possible audit log files.
 *
 * @return string[]
 */
function p2026_audit_log_get_file_paths() {
	$upload_dir = wp_upload_dir();
	if ( ! empty( $upload_dir['error'] ) || empty( $upload_dir['basedir'] ) ) {
		return array();
	}

	$base  = trailingslashit( $upload_dir['basedir'] ) . 'p2026-audit-log.jsonl';
	$paths = array();
	if ( file_exists( $base ) ) {
		$paths[] = $base;
	}

	$rotated = glob( $base . '.*.bak' );
	if ( is_array( $rotated ) ) {
		usort(
			$rotated,
			static function ( $a, $b ) {
				return filemtime( $b ) <=> filemtime( $a );
			}
		);
		$paths = array_merge( $paths, $rotated );
	}

	return $paths;
}

/**
 * Extract shard day from a rotated log file name.
 *
 * @param string $path File path.
 * @return string
 */
function p2026_audit_log_shard_day_from_path( $path ) {
	$filename = basename( (string) $path );
	if ( preg_match( '/\.(\d{8})-\d{6}\.bak$/', $filename, $matches ) ) {
		$raw = $matches[1];
		return substr( $raw, 0, 4 ) . '-' . substr( $raw, 4, 2 ) . '-' . substr( $raw, 6, 2 );
	}

	return '';
}

/**
 * Normalize a timestamp-like value to a UTC day string.
 *
 * @param string $timestamp Timestamp candidate.
 * @return string
 */
function p2026_audit_log_timestamp_to_day( $timestamp ) {
	$timestamp = is_string( $timestamp ) ? trim( $timestamp ) : '';
	if ( '' === $timestamp ) {
		return '';
	}

	$parsed = strtotime( $timestamp );
	if ( false === $parsed ) {
		return '';
	}

	return gmdate( 'Y-m-d', $parsed );
}

/**
 * Normalize a timestamp-like value to ISO-8601.
 *
 * @param string $timestamp Timestamp candidate.
 * @return string
 */
function p2026_audit_log_normalize_timestamp( $timestamp ) {
	$timestamp = is_string( $timestamp ) ? trim( $timestamp ) : '';
	if ( '' === $timestamp ) {
		return '';
	}

	$parsed = strtotime( $timestamp );
	if ( false === $parsed ) {
		return $timestamp;
	}

	return gmdate( 'c', $parsed );
}

/**
 * Normalize one JSONL audit entry into a table-friendly record.
 *
 * @param array  $decoded       Parsed JSON object.
 * @param string $path          Source file path.
 * @param int    $line_number   1-indexed line number.
 * @param string $fallback_day  Day inferred from shard naming.
 * @return array<string,mixed>|null
 */
function p2026_audit_log_normalize_file_entry( $decoded, $path, $line_number, $fallback_day ) {
	if ( ! is_array( $decoded ) ) {
		return null;
	}

	$event_type = isset( $decoded['event_type'] ) ? sanitize_key( (string) $decoded['event_type'] ) : '';
	$payload    = isset( $decoded['payload'] ) && is_array( $decoded['payload'] ) ? $decoded['payload'] : array();
	$timestamp  = isset( $payload['timestamp'] ) ? p2026_audit_log_normalize_timestamp( (string) $payload['timestamp'] ) : '';
	$day        = '' !== $timestamp ? p2026_audit_log_timestamp_to_day( $timestamp ) : $fallback_day;

	if ( '' === $day && file_exists( $path ) ) {
		$day = gmdate( 'Y-m-d', (int) filemtime( $path ) );
	}

	return array(
		'id' => md5( $path . ':' . (int) $line_number . ':' . $event_type . ':' . $timestamp ),
		'day' => $day,
		'timestamp' => $timestamp,
		'event_type' => $event_type,
		'post_id' => isset( $payload['post_id'] ) ? (int) $payload['post_id'] : 0,
		'comment_id' => isset( $payload['comment_id'] ) ? (int) $payload['comment_id'] : 0,
		'actor_id' => isset( $payload['actor_id'] ) ? (int) $payload['actor_id'] : 0,
		'old_state' => isset( $payload['old_state'] ) ? sanitize_key( (string) $payload['old_state'] ) : '',
		'new_state' => isset( $payload['new_state'] ) ? sanitize_key( (string) $payload['new_state'] ) : '',
		'source' => isset( $payload['source'] ) ? sanitize_key( (string) $payload['source'] ) : '',
		'context' => isset( $payload['context'] ) && is_array( $payload['context'] ) ? $payload['context'] : array(),
		'payload' => $payload,
	);
}

/**
 * Read and normalize all file-backed audit entries.
 *
 * @param string $selected_day Optional YYYY-MM-DD day filter.
 * @return array<int,array<string,mixed>>
 */
function p2026_audit_log_read_file_entries( $selected_day = '' ) {
	$entries = array();
	$paths   = p2026_audit_log_get_file_paths();

	foreach ( $paths as $path ) {
		$handle = fopen( $path, 'rb' );
		if ( ! $handle ) {
			continue;
		}

		$line_number  = 0;
		$fallback_day = p2026_audit_log_shard_day_from_path( $path );
		while ( ! feof( $handle ) ) {
			$line = fgets( $handle );
			if ( false === $line ) {
				continue;
			}

			++$line_number;
			$decoded = json_decode( trim( $line ), true );
			$entry   = p2026_audit_log_normalize_file_entry( $decoded, $path, $line_number, $fallback_day );
			if ( ! is_array( $entry ) ) {
				continue;
			}

			if ( '' !== $selected_day && $entry['day'] !== $selected_day ) {
				continue;
			}

			$entries[] = $entry;
		}

		fclose( $handle );
	}

	usort(
		$entries,
		static function ( $a, $b ) {
			$time_a = isset( $a['timestamp'] ) ? strtotime( (string) $a['timestamp'] ) : 0;
			$time_b = isset( $b['timestamp'] ) ? strtotime( (string) $b['timestamp'] ) : 0;
			return (int) $time_b <=> (int) $time_a;
		}
	);

	return $entries;
}

/**
 * Read and normalize CPT-backed audit entries.
 *
 * @param string $selected_day Optional YYYY-MM-DD day filter.
 * @param int    $limit        Max entries to read.
 * @return array<int,array<string,mixed>>
 */
function p2026_audit_log_read_cpt_entries( $selected_day = '', $limit = 500 ) {
	$query_args = array(
		'post_type' => 'p2026_audit_event',
		'post_status' => 'private',
		'posts_per_page' => max( 1, min( 1000, (int) $limit ) ),
		'orderby' => 'date',
		'order' => 'DESC',
		'no_found_rows' => true,
	);

	$query = new WP_Query( $query_args );
	if ( empty( $query->posts ) || ! is_array( $query->posts ) ) {
		return array();
	}

	$entries = array();
	foreach ( $query->posts as $post ) {
		if ( ! $post instanceof WP_Post ) {
			continue;
		}

		$timestamp = (string) get_post_meta( $post->ID, 'p2026_audit_timestamp', true );
		if ( '' === $timestamp ) {
			$timestamp = get_post_time( 'c', true, $post );
		}
		$timestamp = p2026_audit_log_normalize_timestamp( $timestamp );
		$day       = p2026_audit_log_timestamp_to_day( $timestamp );
		if ( '' !== $selected_day && $day !== $selected_day ) {
			continue;
		}

		$event_type = (string) get_post_meta( $post->ID, 'p2026_audit_event_type', true );
		$post_id    = (int) get_post_meta( $post->ID, 'p2026_audit_post_id', true );
		$comment_id = (int) get_post_meta( $post->ID, 'p2026_audit_comment_id', true );
		$actor_id   = (int) get_post_meta( $post->ID, 'p2026_audit_actor_id', true );
		$old_state  = (string) get_post_meta( $post->ID, 'p2026_audit_old_state', true );
		$new_state  = (string) get_post_meta( $post->ID, 'p2026_audit_new_state', true );
		$source     = (string) get_post_meta( $post->ID, 'p2026_audit_source', true );
		$payload    = json_decode( (string) $post->post_content, true );

		$entries[] = array(
			'id' => (int) $post->ID,
			'day' => $day,
			'timestamp' => $timestamp,
			'event_type' => sanitize_key( $event_type ),
			'post_id' => $post_id,
			'comment_id' => $comment_id,
			'actor_id' => $actor_id,
			'old_state' => sanitize_key( $old_state ),
			'new_state' => sanitize_key( $new_state ),
			'source' => sanitize_key( $source ),
			'context' => is_array( $payload['context'] ?? null ) ? $payload['context'] : array(),
			'payload' => is_array( $payload ) ? $payload : array(),
		);
	}

	return $entries;
}

/**
 * Return available day shards for the current backend.
 *
 * @return string[]
 */
function p2026_audit_log_get_available_days() {
	$days = array();

	if ( 'cpt' === p2026_audit_log_get_backend() ) {
		$entries = p2026_audit_log_read_cpt_entries( '', 1000 );
	} else {
		$entries = p2026_audit_log_read_file_entries();
	}

	foreach ( $entries as $entry ) {
		if ( empty( $entry['day'] ) || ! is_string( $entry['day'] ) ) {
			continue;
		}
		$days[ $entry['day'] ] = true;
	}

	$days = array_keys( $days );
	rsort( $days, SORT_STRING );

	return $days;
}

/**
 * REST callback: return available audit-log days.
 *
 * @return WP_REST_Response
 */
function p2026_audit_log_rest_days() {
	return rest_ensure_response(
		array(
			'days' => p2026_audit_log_get_available_days(),
			'backend' => p2026_audit_log_get_backend(),
		)
	);
}

/**
 * REST callback: return paged audit-log entries.
 *
 * @param WP_REST_Request $request Request instance.
 * @return WP_REST_Response
 */
function p2026_audit_log_rest_entries( WP_REST_Request $request ) {
	$selected_day = sanitize_text_field( (string) $request->get_param( 'day' ) );
	if ( '' !== $selected_day && ! preg_match( '/^\d{4}-\d{2}-\d{2}$/', $selected_day ) ) {
		$selected_day = '';
	}

	$page = max( 1, (int) $request->get_param( 'page' ) );
	$per_page = max( 1, min( 500, (int) $request->get_param( 'per_page' ) ) );

	if ( 'cpt' === p2026_audit_log_get_backend() ) {
		$entries = p2026_audit_log_read_cpt_entries( $selected_day, 2000 );
	} else {
		$entries = p2026_audit_log_read_file_entries( $selected_day );
	}

	$total = count( $entries );
	$start = ( $page - 1 ) * $per_page;
	$items = array_slice( $entries, $start, $per_page );
	$total_pages = max( 1, (int) ceil( $total / $per_page ) );

	$response = rest_ensure_response( array_values( $items ) );
	$response->header( 'X-WP-Total', (string) $total );
	$response->header( 'X-WP-TotalPages', (string) $total_pages );

	return $response;
}

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
	$event_type = sanitize_key( (string) $event_type );
	$actor_id   = (int) ( $payload['actor_id'] ?? 0 );
	$post_id    = (int) ( $payload['post_id'] ?? 0 );
	$comment_id = (int) ( $payload['comment_id'] ?? 0 );

	$title = sprintf(
		/* translators: 1: event type, 2: post id */
		__( '%1$s: Post %2$d', 'p2026' ),
		$event_type,
		$post_id
	);

	if ( $comment_id > 0 ) {
		$title = sprintf(
			/* translators: 1: event type, 2: comment id */
			__( '%1$s: Comment %2$d', 'p2026' ),
			$event_type,
			$comment_id
		);
	}

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

	update_post_meta( $audit_post_id, 'p2026_audit_event_type', $event_type );
	update_post_meta( $audit_post_id, 'p2026_audit_post_id', $post_id );
	update_post_meta( $audit_post_id, 'p2026_audit_comment_id', $comment_id );
	update_post_meta( $audit_post_id, 'p2026_audit_actor_id', $actor_id );
	update_post_meta( $audit_post_id, 'p2026_audit_old_state', sanitize_key( (string) ( $payload['old_state'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_new_state', sanitize_key( (string) ( $payload['new_state'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_timestamp', sanitize_text_field( (string) ( $payload['timestamp'] ?? '' ) ) );
	update_post_meta( $audit_post_id, 'p2026_audit_source', sanitize_key( (string) ( $payload['source'] ?? '' ) ) );

	if ( '' !== $event_type ) {
		$event_type_name = ucwords( str_replace( array( '-', '_' ), ' ', $event_type ) );
		$event_type_term = p2026_audit_log_get_or_create_term_id(
			P2026_AUDIT_LOG_EVENT_TYPE_TAXONOMY,
			$event_type,
			$event_type_name
		);
		if ( $event_type_term > 0 ) {
			wp_set_object_terms( $audit_post_id, array( $event_type_term ), P2026_AUDIT_LOG_EVENT_TYPE_TAXONOMY, false );
		}
	}

	if ( $actor_id > 0 ) {
		$actor_slug = 'user-' . $actor_id;
		$actor_name = sprintf(
			/* translators: %d: user id */
			__( 'User %d', 'p2026' ),
			$actor_id
		);
		$user = get_userdata( $actor_id );
		if ( $user && ! empty( $user->display_name ) ) {
			$actor_name = sprintf(
				/* translators: 1: display name, 2: user id */
				__( '%1$s (#%2$d)', 'p2026' ),
				$user->display_name,
				$actor_id
			);
		}

		$actor_term = p2026_audit_log_get_or_create_term_id(
			P2026_AUDIT_LOG_ACTOR_TAXONOMY,
			$actor_slug,
			$actor_name
		);
		if ( $actor_term > 0 ) {
			wp_set_object_terms( $audit_post_id, array( $actor_term ), P2026_AUDIT_LOG_ACTOR_TAXONOMY, false );
		}
	}
}
