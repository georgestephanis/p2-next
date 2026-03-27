<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// ---------------------------------------------------------------------------
// Sample users — 15 team members used as post authors and commenters.
// Slugs match the @mention tokens used in post content and comments below.
// ---------------------------------------------------------------------------

$sample_users = [
    [
        'user_login'   => 'alice',
        'display_name' => 'Alice Chen',
        'user_email'   => 'alice@example.com',
        'description'  => 'Frontend engineer. Passionate about accessible UIs and design systems.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'bob',
        'display_name' => 'Bob Martinez',
        'user_email'   => 'bob@example.com',
        'description'  => 'Full-stack developer who loves a well-placed cache invalidation.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'carol',
        'display_name' => 'Carol Singh',
        'user_email'   => 'carol@example.com',
        'description'  => 'Product designer. Turns rough ideas into polished interfaces.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'dave',
        'display_name' => 'Dave Kim',
        'user_email'   => 'dave@example.com',
        'description'  => 'Backend engineer specialising in WordPress core and REST APIs.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'eve',
        'display_name' => 'Eve Okafor',
        'user_email'   => 'eve@example.com',
        'description'  => 'Infrastructure engineer. If it scales, she probably built it.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'frank',
        'display_name' => 'Frank Novak',
        'user_email'   => 'frank@example.com',
        'description'  => 'Developer advocate. Writes docs, gives talks, fixes onboarding.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'grace',
        'display_name' => 'Grace Li',
        'user_email'   => 'grace@example.com',
        'description'  => 'QA engineer. Nothing ships without her sign-off.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'hank',
        'display_name' => 'Hank Patel',
        'user_email'   => 'hank@example.com',
        'description'  => 'Performance engineer. Obsessed with Core Web Vitals.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'iris',
        'display_name' => 'Iris Johansson',
        'user_email'   => 'iris@example.com',
        'description'  => 'Security researcher. Reads CVEs for fun.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'jack',
        'display_name' => 'Jack Reyes',
        'user_email'   => 'jack@example.com',
        'description'  => 'Mobile engineer branching out into web. Still learning CSS.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'kate',
        'display_name' => 'Kate Dubois',
        'user_email'   => 'kate@example.com',
        'description'  => 'Engineering manager. Keeps the team unblocked and the roadmap honest.',
        'role'         => 'editor',
    ],
    [
        'user_login'   => 'liam',
        'display_name' => "Liam O'Brien",
        'user_email'   => 'liam@example.com',
        'description'  => 'Data engineer. Turns logs into dashboards.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'maya',
        'display_name' => 'Maya Thornton',
        'user_email'   => 'maya@example.com',
        'description'  => 'Technical writer. Believes good documentation is a feature.',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'nate',
        'display_name' => 'Nate Ferreira',
        'user_email'   => 'nate@example.com',
        'description'  => 'DevOps engineer. Makes deployments boring (in the best way).',
        'role'         => 'author',
    ],
    [
        'user_login'   => 'olivia',
        'display_name' => 'Olivia Nakamura',
        'user_email'   => 'olivia@example.com',
        'description'  => 'React specialist. Thinks in components, dreams in hooks.',
        'role'         => 'editor',
    ],
];

// Create users and build a slug → user_id map for use below.
$user_ids = [];
foreach ( $sample_users as $data ) {
    $existing = get_user_by( 'login', $data['user_login'] );
    if ( $existing ) {
        $uid = $existing->ID;
    } else {
        $uid = wp_insert_user( [
            'user_login'   => $data['user_login'],
            'user_pass'    => wp_generate_password(),
            'display_name' => $data['display_name'],
            'user_email'   => $data['user_email'],
            'role'         => $data['role'],
        ] );
    }

    if ( $uid && ! is_wp_error( $uid ) ) {
        update_user_meta( $uid, 'description', $data['description'] );
        $user_ids[ $data['user_login'] ] = $uid;
    }
}

// ---------------------------------------------------------------------------
// Sample posts — authored by different team members, with @mention tokens
// that the mentions module will linkify on output.
// ---------------------------------------------------------------------------

$sample_posts = [
    [
        'post_title'   => 'Welcome to P2026',
        'post_content' => '<!-- wp:paragraph --><p>This is a test post. Use the ⋯ menu in the top-right corner to edit it, copy a link, or delete it.</p><!-- /wp:paragraph -->'
            . "\n" . '<!-- wp:paragraph --><p>Say hi to @alice and @bob — they built most of the editor you\'re using right now.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => $user_ids['kate'] ?? 1,
    ],
    [
        'post_title'   => 'Try the comments',
        'post_content' => '<!-- wp:paragraph --><p>Open the ⋯ menu on any post and click the comments item to expand the thread and reply inline. #todo</p><!-- /wp:paragraph -->'
            . "\n" . '<!-- wp:paragraph --><p>@carol designed the comment UI and @dave wired up the REST endpoints — give it a try and let them know what you think.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => $user_ids['frank'] ?? 1,
    ],
    [
        'post_title'   => 'Inline editing with the Block Editor',
        'post_content' => '<!-- wp:paragraph --><p>Open the ⋯ menu and click Edit to update this post using the Block Editor without leaving the page.</p><!-- /wp:paragraph -->'
            . "\n" . '<!-- wp:paragraph --><p>Shoutout to @olivia for the React work and @hank for making sure it doesn\'t tank the performance budget.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => $user_ids['maya'] ?? 1,
    ],
    [
        'post_title'   => '@mention support is live',
        'post_content' => '<!-- wp:paragraph --><p>Type <code>@</code> followed by a username in any post or comment to mention a teammate. Hovering a mention shows a profile card.</p><!-- /wp:paragraph -->'
            . "\n" . '<!-- wp:paragraph --><p>Thanks to @iris for the security review and @grace for thorough QA before we shipped.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => $user_ids['alice'] ?? 1,
    ],
];

$post_ids = [];
foreach ( $sample_posts as $data ) {
    $post_ids[] = wp_insert_post( $data );
}

$seed_comment_ids = [];

// ---------------------------------------------------------------------------
// Sample comments on "Try the comments" (index 1) — tied to real user accounts.
// Thread structure:
//   L0-A  alice   "Great post!"
//     L1-A  bob     "Thanks!"
//       L2-A  carol   "Agreed, very useful."
//         L3-A  dave  "Exactly what I was thinking."
//   L0-B  eve     "How does the polling work?"
//     L1-B  alice   "It hits /wp/v2/posts every 15 seconds."
//       L2-B  eve     "Does it back off on errors?"
//         L3-B  bob   "Not yet — @hank and @iris are looking at backoff."
//   L0-C  frank   "Is anonymous commenting supported?"
//     L1-C  kate    "Yes — @dave added it. Name/email optional per WP settings."
// ---------------------------------------------------------------------------

if ( ! empty( $post_ids[1] ) ) {
    $comments_post = $post_ids[1];

    // Helper: build the comment array for a registered user.
    $comment_by = static function ( $slug, $content, $parent = 0 ) use ( $user_ids, $sample_users, $comments_post ) {
        $uid  = $user_ids[ $slug ] ?? 0;
        $name  = '';
        $email = '';
        foreach ( $sample_users as $u ) {
            if ( $u['user_login'] === $slug ) {
                $name  = $u['display_name'];
                $email = $u['user_email'];
                break;
            }
        }
        return [
            'comment_post_ID'      => $comments_post,
            'user_id'              => $uid,
            'comment_author'       => $name,
            'comment_author_email' => $email,
            'comment_content'      => $content,
            'comment_approved'     => 1,
            'comment_parent'       => $parent,
        ];
    };

    $l0a = wp_insert_comment( $comment_by( 'alice', 'Great post! Really enjoying the new inline comment experience.' ) );
    $l1a = wp_insert_comment( $comment_by( 'bob',   'Thanks! It was a fun one to build.',                             $l0a ) );
    $l2a = wp_insert_comment( $comment_by( 'carol', 'Agreed — much nicer than a full page reload.',                   $l1a ) );
           wp_insert_comment( $comment_by( 'dave',  'Exactly what I was thinking. The animation is a nice touch.',    $l2a ) );

    $seed_comment_ids['thread_a_root']  = (int) $l0a;
    $seed_comment_ids['thread_a_reply'] = (int) $l1a;

    $l0b = wp_insert_comment( $comment_by( 'eve',   'How does the live polling work under the hood?' ) );
    $l1b = wp_insert_comment( $comment_by( 'alice', 'It calls GET /wp/v2/posts every 15 seconds and buffers new ones behind a banner.', $l0b ) );
    $l2b = wp_insert_comment( $comment_by( 'eve',   'Smart. Does it back off if the request fails?',                  $l1b ) );
           wp_insert_comment( $comment_by( 'bob',   'Not yet — @hank and @iris are looking at backoff strategies.',   $l2b ) );

    $l0c = wp_insert_comment( $comment_by( 'frank', 'Is anonymous commenting supported for guests?' ) );
           wp_insert_comment( $comment_by( 'kate',  'Yes — @dave added it. Whether name/email are required follows the standard WordPress setting.', $l0c ) );

    $seed_comment_ids['thread_c_root'] = (int) $l0c;
}

// ---------------------------------------------------------------------------
// Seed notifications for the default Playground login user (admin).
// Include both post-level and comment-level notifications so the dock has
// realistic starter items on first load.
// ---------------------------------------------------------------------------

$starter_user = get_user_by( 'login', 'admin' );
if ( $starter_user && function_exists( 'p2026_create_notification' ) ) {
    $seed_marker_key = 'p2026_seed_notifications_v1';
    $already_seeded  = get_user_meta( $starter_user->ID, $seed_marker_key, true );

    if ( empty( $already_seeded ) ) {
        $seed_notifications = [
            [
                'type'       => 'mention',
                'post_id'    => (int) ( $post_ids[0] ?? 0 ),
                'comment_id' => 0,
                'from_user'  => (int) ( $user_ids['kate'] ?? 0 ),
            ],
            [
                'type'       => 'reply',
                'post_id'    => (int) ( $post_ids[1] ?? 0 ),
                'comment_id' => (int) ( $seed_comment_ids['thread_a_reply'] ?? 0 ),
                'from_user'  => (int) ( $user_ids['bob'] ?? 0 ),
            ],
            [
                'type'       => 'reply',
                'post_id'    => (int) ( $post_ids[1] ?? 0 ),
                'comment_id' => (int) ( $seed_comment_ids['thread_c_root'] ?? 0 ),
                'from_user'  => (int) ( $user_ids['frank'] ?? 0 ),
            ],
        ];

        foreach ( $seed_notifications as $notification ) {
            if ( $notification['post_id'] <= 0 || $notification['from_user'] <= 0 ) {
                continue;
            }

            p2026_create_notification(
                (int) $starter_user->ID,
                $notification['type'],
                $notification['post_id'],
                $notification['comment_id'],
                $notification['from_user']
            );
        }

        update_user_meta( $starter_user->ID, $seed_marker_key, current_time( 'c' ) );
    }
}

// Ensure the homepage shows the latest posts (not a static page), so the
// Home template — not front-page — is used.
update_option( 'show_on_front', 'posts' );

// ---------------------------------------------------------------------------
// Build a Home template that prepends the p2026/new-post block.
//
// Strategy:
//   1. Ask WordPress for the active Home template (picks up both theme-file
//      and any existing DB customization via get_block_templates()).
//   2. If one exists, use its content as the base so we preserve the theme's
//      own layout rather than shipping a hard-coded query loop.
//   3. Prepend the new-post block and write it back as a user customisation
//      (wp_template post associated with the active theme).
//   4. If no Home template exists at all, fall back to a minimal query loop.
// ---------------------------------------------------------------------------

$theme_slug           = wp_get_theme()->get_stylesheet();
$template_slug        = 'home';
$legacy_template_slug = sanitize_title( $theme_slug . '//' . $template_slug );

// get_block_templates() merges file-based and DB templates; it returns
// WP_Block_Template objects whose ->slug is the bare slug (no theme prefix).
$found = get_block_templates( [ 'slug__in' => [ $template_slug ] ], 'wp_template' );

$base_content = '';
foreach ( $found as $tmpl ) {
    if ( $template_slug === $tmpl->slug ) {
        $base_content = $tmpl->content;
        break;
    }
}

// Fallback: a minimal post-query loop if the theme ships no Home template.
// Wrap it with the theme's header/footer template parts if they exist.
if ( empty( $base_content ) ) {
    $query_loop = '<!-- wp:query {"queryId":1,"query":{"perPage":10,"postType":"post","order":"desc","orderBy":"date","inherit":true}} -->' . "\n"
        . '<div class="wp-block-query">' . "\n"
        . '<!-- wp:post-template -->' . "\n"
        . '<!-- wp:group {"tagName":"article","layout":{"type":"constrained"}} -->' . "\n"
        . '<div class="wp-block-group">' . "\n"
        . '<!-- wp:post-title {"isLink":true} /-->' . "\n"
        . '<!-- wp:post-date /-->' . "\n"
        . '<!-- wp:post-content /-->' . "\n"
        . '</div>' . "\n"
        . '<!-- /wp:group -->' . "\n"
        . '<!-- /wp:post-template -->' . "\n"
        . '</div>' . "\n"
        . '<!-- /wp:query -->';

    // Check whether the theme provides header/footer template parts and
    // include them so the fallback template isn't chrome-less.
    $header_block = '';
    $footer_block = '';

    $parts = get_block_templates(
        [ 'slug__in' => [ 'header', 'footer' ] ],
        'wp_template_part'
    );
    foreach ( $parts as $part ) {
        if ( 'header' === $part->slug ) {
            $header_block = sprintf(
                '<!-- wp:template-part {"slug":"header","theme":"%s","tagName":"header"} /-->',
                $theme_slug
            );
        } elseif ( 'footer' === $part->slug ) {
            $footer_block = sprintf(
                '<!-- wp:template-part {"slug":"footer","theme":"%s","tagName":"footer"} /-->',
                $theme_slug
            );
        }
    }

    // In the fallback we built the template ourselves, so slot the new-post
    // block between the header part and the query loop.
    $parts       = array_filter( [ $header_block, '<!-- wp:p2026/new-post /-->', $query_loop, $footer_block ] );
    $new_content = implode( "\n", $parts );
} else {
    // For an existing template, inject after the header template-part block
    // if one is present, otherwise prepend to the whole content.
    if ( preg_match(
        '/<!-- wp:template-part [^\n]*"slug"\s*:\s*"header"[^\n]*\/-->/',
        $base_content,
        $match,
        PREG_OFFSET_CAPTURE
    ) ) {
        $insert_at   = $match[0][1] + strlen( $match[0][0] );
        $new_content = substr( $base_content, 0, $insert_at )
            . "\n<!-- wp:p2026/new-post /-->"
            . substr( $base_content, $insert_at );
    } else {
        $new_content = '<!-- wp:p2026/new-post /-->' . "\n" . $base_content;
    }
}

// Look for an existing user-customised DB record to update instead of insert.
// get_posts() by post_name is unreliable here because WordPress sanitizes '//'
// in post_name on insert. Use the WP_Block_Template objects from the earlier
// get_block_templates() call directly — source === 'custom' means it is a
// DB-stored override and ->wp_id is its post ID.
$existing_custom = null;
foreach ( $found as $tmpl ) {
    if ( $template_slug === $tmpl->slug && 'custom' === $tmpl->source ) {
        $existing_custom = $tmpl;
        break;
    }
}

$legacy_custom = null;
if ( ! $existing_custom && $legacy_template_slug !== $template_slug ) {
    $legacy_templates = get_posts(
        [
            'name'                   => $legacy_template_slug,
            'post_type'              => 'wp_template',
            'post_status'            => [ 'publish', 'draft', 'auto-draft' ],
            'posts_per_page'         => 1,
            'no_found_rows'          => true,
            'update_post_meta_cache' => false,
            'update_post_term_cache' => false,
            'tax_query'              => [
                [
                    'taxonomy' => 'wp_theme',
                    'field'    => 'name',
                    'terms'    => $theme_slug,
                ],
            ],
        ]
    );

    if ( ! empty( $legacy_templates ) ) {
        $legacy_custom = $legacy_templates[0];
    }
}

if ( $existing_custom ) {
    wp_update_post( [
        'ID'           => $existing_custom->wp_id,
        'post_content' => $new_content,
        'post_status'  => 'publish',
    ] );
} elseif ( $legacy_custom ) {
    wp_update_post( [
        'ID'           => $legacy_custom->ID,
        'post_name'    => $template_slug,
        'post_title'   => 'Blog Home',
        'post_content' => $new_content,
        'post_status'  => 'publish',
    ] );
} else {
    $post_id = wp_insert_post( [
        'post_type'    => 'wp_template',
        'post_name'    => $template_slug,
        'post_title'   => 'Blog Home',
        'post_content' => $new_content,
        'post_status'  => 'publish',
        'post_author'  => 1,
        'tax_input'    => [
            'wp_theme' => [ $theme_slug ],
        ],
    ] );
}
