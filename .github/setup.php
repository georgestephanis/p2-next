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

// Insert a custom Home template that places the new-post editor above the feed.

$query_block = <<<'BLOCK'
<!-- wp:query {\"queryId\":1,\"query\":{\"perPage\":10,\"postType\":\"post\",\"order\":\"desc\",\"orderBy\":\"date\",\"inherit\":true}} -->
<div class=\"wp-block-query\">
    <!-- wp:post-template -->
        <!-- wp:group {\"tagName\":\"article\",\"layout\":{\"type\":\"constrained\"}} -->
        <div class=\"wp-block-group\">
            <!-- wp:post-title {\"isLink\":true} /-->
            <!-- wp:post-date /-->
            <!-- wp:post-content /-->
        </div>
        <!-- /wp:group -->
    <!-- /wp:post-template -->
</div>
<!-- /wp:query -->
BLOCK;

$theme_slug = wp_get_theme()->get_stylesheet();

$post_id    = wp_insert_post( [
    'post_type'    => 'wp_template',
    'post_name'    => 'home',
    'post_title'   => 'Home',
    'post_content' => '<!-- wp:p2026/new-post /-->' . "\n" . $query_block,
    'post_status'  => 'publish',
    'post_author'  => 1,
] );

if ( $post_id && ! is_wp_error( $post_id ) ) {
    wp_set_object_terms( $post_id, $theme_slug, 'wp_theme' );
}
