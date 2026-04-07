/**
 * Sidebar Shell: admin block editor.
 *
 * Mounts a minimal block editor on the Sidebar Shell settings tab so
 * administrators can visually compose the default block content instead of
 * hand-writing markup.  The editor keeps a hidden <textarea> in sync so the
 * standard settings form POST delivers serialized block markup to PHP.
 *
 * Allowed blocks are limited to those that make sense in a sidebar context:
 * search, post/comment/category/tag lists, feeds, calendars, rich text, and
 * basic layout primitives.
 */

import { createRoot, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { serialize, parse } from '@wordpress/blocks';
import {
	BlockEditorKeyboardShortcuts,
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	Inserter,
} from '@wordpress/block-editor';
import { SlotFillProvider, Popover, Button } from '@wordpress/components';

import './admin.scss';

/**
 * Block types available in the sidebar-shell editor.
 *
 * Covers common sidebar use-cases: search, post/comment/term lists, feeds,
 * calendar, embeds, and basic layout/text primitives.
 */
const ALLOWED_BLOCKS = [
	'core/search',
	'core/latest-posts',
	'core/latest-comments',
	'core/calendar',
	'core/tag-cloud',
	'core/categories',
	'core/archives',
	'core/rss',
	'core/social-links',
	'core/social-link',
	'core/html',
	'core/image',
	'core/heading',
	'core/paragraph',
	'core/separator',
	'core/spacer',
	'core/group',
];

/** @type {import('@wordpress/block-editor').BlockEditorSettings} */
const EDITOR_SETTINGS = {
	allowedBlockTypes: ALLOWED_BLOCKS,
	hasFixedToolbar: true,
};

/**
 * Minimal standalone block editor for configuring sidebar-shell block content.
 *
 * @param {Object}   props
 * @param {string}   props.initialContent  Serialised block markup to pre-populate.
 * @param {Function} props.onUpdate        Called with fresh serialised markup on every change.
 */
function SidebarShellEditor( { initialContent, onUpdate } ) {
	const [ blocks, setBlocks ] = useState( () => parse( initialContent ) );

	function handleChange( newBlocks ) {
		setBlocks( newBlocks );
		onUpdate( serialize( newBlocks ) );
	}

	return (
		<SlotFillProvider>
			<BlockEditorProvider
				value={ blocks }
				onInput={ setBlocks }
				onChange={ handleChange }
				settings={ EDITOR_SETTINGS }
			>
				<BlockEditorKeyboardShortcuts.Register />

				<div className="p2026-sidebar-shell-admin-editor">
					<div className="p2026-sidebar-shell-admin-editor__header">
						<Inserter
							rootClientId={ undefined }
							isAppender
							renderToggle={ ( {
								onToggle,
								isOpen,
								disabled,
							} ) => (
								<Button
									variant="secondary"
									onClick={ onToggle }
									isPressed={ isOpen }
									disabled={ disabled }
								>
									{ __( 'Add Block', 'p2026' ) }
								</Button>
							) }
						/>
					</div>

					<BlockTools>
						<div className="p2026-sidebar-shell-admin-editor__canvas editor-styles-wrapper">
							<WritingFlow>
								<BlockList />
							</WritingFlow>
						</div>
					</BlockTools>
				</div>

				<Popover.Slot />
			</BlockEditorProvider>
		</SlotFillProvider>
	);
}

/**
 * Mount the editor once the DOM is ready.
 */
function init() {
	const container = document.getElementById(
		'p2026-sidebar-shell-block-editor'
	);
	const textarea = document.getElementById(
		'p2026-sidebar-shell-blocks-field'
	);

	if ( ! container || ! textarea ) {
		return;
	}

	// Hide the raw textarea — the editor becomes the primary UI. If the
	// script fails to execute the textarea remains visible as a fallback.
	textarea.hidden = true;

	createRoot( container ).render(
		<SidebarShellEditor
			initialContent={ textarea.value }
			onUpdate={ ( markup ) => {
				textarea.value = markup;
			} }
		/>
	);
}

if ( document.readyState !== 'loading' ) {
	init();
} else {
	document.addEventListener( 'DOMContentLoaded', init );
}
