<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Create sample posts for testing the feed, comments, and inline editing.
$sample_posts = [
    [
        'post_title'   => 'Welcome to P2026',
        'post_content' => '<!-- wp:paragraph --><p>This is a test post. Use the \u22ef menu in the top-right corner to edit it, copy a link, or delete it.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => 1,
    ],
    [
        'post_title'   => 'Try the comments',
        'post_content' => '<!-- wp:paragraph --><p>Open the \u22ef menu on any post and click the comments item to expand the thread and reply inline.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => 1,
    ],
    [
        'post_title'   => 'Inline editing with the Block Editor',
        'post_content' => '<!-- wp:paragraph --><p>Open the \u22ef menu and click Edit to update this post using the Block Editor without leaving the page.</p><!-- /wp:paragraph -->',
        'post_status'  => 'publish',
        'post_author'  => 1,
    ],
];

foreach ( $sample_posts as $data ) {
    wp_insert_post( $data );
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

$theme_slug    = wp_get_theme()->get_stylesheet();
$template_name = $theme_slug . '//home';

// get_block_templates() merges file-based and DB templates; it returns
// WP_Block_Template objects whose ->slug is the bare slug (no theme prefix).
$found = get_block_templates( [ 'slug__in' => [ 'home' ] ], 'wp_template' );

$base_content = '';
foreach ( $found as $tmpl ) {
    if ( 'home' === $tmpl->slug ) {
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

    $parts = array_filter( [ $header_block, $query_loop, $footer_block ] );
    $base_content = implode( "\n", $parts );
}

$new_content = '<!-- wp:p2026/new-post /-->' . "\n" . $base_content;

// Look for an existing user-customised DB record to update instead of insert.
// WordPress stores template post_name as "{theme_slug}//home".
$existing = get_posts( [
    'post_type'   => 'wp_template',
    'name'        => $template_name,
    'numberposts' => 1,
    'post_status' => 'any',
] );

if ( $existing ) {
    wp_update_post( [
        'ID'           => $existing[0]->ID,
        'post_content' => $new_content,
        'post_status'  => 'publish',
    ] );
} else {
    $post_id = wp_insert_post( [
        'post_type'    => 'wp_template',
        'post_name'    => $template_name,
        'post_title'   => 'Home',
        'post_content' => $new_content,
        'post_status'  => 'publish',
        'post_author'  => 1,
    ] );

    if ( $post_id && ! is_wp_error( $post_id ) ) {
        wp_set_object_terms( $post_id, $theme_slug, 'wp_theme' );
    }
}
