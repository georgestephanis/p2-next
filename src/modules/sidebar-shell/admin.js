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
import onDomReady from '../../utils/on-dom-ready';

import './admin.scss';

/**
 * Block types available in the sidebar-shell editor.
 *
 * Covers common sidebar use-cases: search, post/comment/term lists, feeds,
 * calendar, embeds, and basic layout/text primitives.
 */
const ALLOWED_BLOCKS = [
	'p2026/feed-tools',
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
 * Required core blocks for the Sidebar Shell defaults.
 */
const REQUIRED_CORE_BLOCKS = [
	'core/search',
	'core/latest-posts',
	'core/latest-comments',
];

/**
 * Whether all required core blocks are currently registered.
 *
 * @return {boolean} True when all required core block types are registered.
 */
function hasRequiredCoreBlocks() {
	const getBlockType = window.wp?.blocks?.getBlockType;
	if ( typeof getBlockType !== 'function' ) {
		return false;
	}

	return REQUIRED_CORE_BLOCKS.every( ( name ) => !! getBlockType( name ) );
}

/**
 * Ensure required core blocks are registered.
 *
 * On non-editor admin screens, wp-block-library can load without having
 * executed its registration path yet. In that case we call the exposed
 * registration function directly as a fallback.
 *
 * @return {boolean} Whether required blocks are available after ensuring registration.
 */
function ensureRequiredCoreBlocks() {
	if ( hasRequiredCoreBlocks() ) {
		return true;
	}

	const registerCoreBlocks =
		window.wp?.blockLibrary?.registerCoreBlocks ||
		window.wp?.blockLibrary?.__experimentalRegisterCoreBlocks;

	if ( typeof registerCoreBlocks === 'function' ) {
		// eslint-disable-next-line no-console
		console.log(
			'[p2026 sidebar-shell admin] core blocks missing; calling blockLibrary.registerCoreBlocks() fallback.'
		);

		try {
			registerCoreBlocks();
		} catch ( error ) {
			// eslint-disable-next-line no-console
			console.error(
				'[p2026 sidebar-shell admin] registerCoreBlocks() failed:',
				error
			);
		}
	}

	return hasRequiredCoreBlocks();
}

/**
 * Minimal standalone block editor for configuring sidebar-shell block content.
 *
 * @param {Object}   props
 * @param {string}   props.initialContent Serialised block markup to pre-populate.
 * @param {Function} props.onUpdate       Called with fresh serialised markup on every change.
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
	const shell = document.querySelector( '.p2026-sidebar-shell-admin-shell' );
	const container = document.getElementById(
		'p2026-sidebar-shell-block-editor'
	);
	const textarea = document.getElementById(
		'p2026-sidebar-shell-blocks-field'
	);

	if ( ! shell || ! container || ! textarea ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[p2026 sidebar-shell admin] Mount elements not found — editor will not mount.'
		);
		return;
	}

	// Use the saved content; fall back to the default markup injected by PHP
	// so the editor isn't blank when no custom content has been saved yet.
	// The textarea intentionally stays empty until the user makes a change,
	// preserving the "empty option = use built-in defaults" semantic.
	const initialContent =
		textarea.value || container.dataset.defaultContent || '';

	const blocksReady = ensureRequiredCoreBlocks();
	if ( ! blocksReady ) {
		// eslint-disable-next-line no-console
		console.warn(
			'[p2026 sidebar-shell admin] required core blocks are still unavailable after fallback registration.'
		);
	}

	createRoot( container ).render(
		<SidebarShellEditor
			initialContent={ initialContent }
			onUpdate={ ( markup ) => {
				textarea.value = markup;
			} }
		/>
	);

	// Only hide the fallback textarea after the editor mounts successfully.
	shell.classList.add( 'is-editor-mounted' );
}

onDomReady( init );
