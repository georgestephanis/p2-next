<?php
// This file is generated. Do not modify it manually.
return array(
	'feed-tools' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'p2026/feed-tools',
		'title' => 'Feed Tools',
		'category' => 'widgets',
		'description' => 'Renders the p2026 feed tools (search and state filters) on the frontend.',
		'keywords' => array(
			'p2',
			'o2',
			'feed',
			'search',
			'filters'
		),
		'supports' => array(
			'html' => false,
			'multiple' => true
		),
		'textdomain' => 'p2026',
		'editorScript' => 'file:./index.js',
		'viewScript' => 'file:./view.js',
		'render' => 'file:./render.php'
	),
	'new-post' => array(
		'$schema' => 'https://schemas.wp.org/trunk/block.json',
		'apiVersion' => 3,
		'name' => 'p2026/new-post',
		'title' => 'New Post Editor',
		'category' => 'widgets',
		'description' => 'Embeds the Block Editor on the frontend so visitors can create posts without leaving the page.',
		'keywords' => array(
			'p2',
			'o2',
			'new post',
			'editor',
			'frontend'
		),
		'supports' => array(
			'html' => false,
			'multiple' => false
		),
		'textdomain' => 'p2026',
		'editorScript' => 'file:./index.js',
		'viewScript' => 'file:./view.js',
		'render' => 'file:./render.php'
	)
);
