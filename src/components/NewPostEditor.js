/**
 * NewPostEditor — embeds a minimal block editor on the frontend.
 *
 * Uses BlockEditorProvider + BlockList from @wordpress/block-editor so the
 * user gets the full block-authoring experience without the admin chrome.
 */
import { useState, useCallback } from '@wordpress/element';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	ObserveTyping,
	BlockEditorKeyboardShortcuts,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { Button, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

// Minimal editor settings — disable features not needed on the frontend.
const EDITOR_SETTINGS = {
	hasFixedToolbar: false,
	focusMode: false,
	isRTL: document.documentElement.dir === 'rtl',
	__experimentalFeatures: {
		typography: { dropCap: false },
	},
};

export default function NewPostEditor( { onAfterPublish } ) {
	const [ title, setTitle ] = useState( '' );
	const [ isTitleEditing, setIsTitleEditing ] = useState( false );
	const [ blocks, setBlocks ] = useState( [
		createBlock( 'core/paragraph' ),
	] );
	const { createPost } = useDispatch( STORE_NAME );
	const { selectBlock } = useDispatch( 'core/block-editor' );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingPost( 'new' )
	);

	// Clicking or pressing Enter/Space on the canvas backdrop (not a block)
	// selects the nearest block (click) or the first block (keyboard).
	const onCanvasKeyDown = useCallback(
		( e ) => {
			if ( e.target !== e.currentTarget ) {
				return;
			}
			if ( e.key !== 'Enter' && e.key !== ' ' ) {
				return;
			}
			const first = e.currentTarget.querySelector( '[data-block]' );
			if ( first ) {
				selectBlock( first.dataset.block );
			}
		},
		[ selectBlock ]
	);

	const onCanvasClick = useCallback(
		( e ) => {
			if ( e.target !== e.currentTarget ) {
				return;
			}
			const blockEls = [
				...e.currentTarget.querySelectorAll( '[data-block]' ),
			];
			if ( ! blockEls.length ) {
				return;
			}
			const { clientY } = e;
			const nearest = blockEls.reduce( ( best, el ) => {
				const { top, height } = el.getBoundingClientRect();
				const dist = Math.abs( clientY - ( top + height / 2 ) );
				const { top: bt, height: bh } = best.getBoundingClientRect();
				return dist < Math.abs( clientY - ( bt + bh / 2 ) ) ? el : best;
			} );
			selectBlock( nearest.dataset.block );
		},
		[ selectBlock ]
	);

	const onPublish = useCallback( async () => {
		if ( ! blocks.length ) {
			return;
		}
		await createPost( { blocks, title } );
		// Reset editor to a fresh paragraph after successful save.
		setTitle( '' );
		setIsTitleEditing( false );
		setBlocks( [ createBlock( 'core/paragraph' ) ] );
		onAfterPublish?.();
	}, [ blocks, createPost, onAfterPublish, title ] );

	return (
		<div className="p2026-new-post-editor">
			<div className="p2026-new-post-header">
				<span className="p2026-new-post-prompt">
					{ __( "What's on your mind?", 'p2026' ) }
				</span>
				{ ! isTitleEditing && (
					<Button
						variant="tertiary"
						icon="edit"
						className="p2026-editor-title-toggle"
						onClick={ () => setIsTitleEditing( true ) }
						disabled={ isSaving }
						label={ __( 'Add title', 'p2026' ) }
						showTooltip
					/>
				) }
			</div>
			{ isTitleEditing && (
				<TextControl
					label={ __( 'Title', 'p2026' ) }
					value={ title }
					onChange={ setTitle }
					className="p2026-editor-title"
					placeholder={ __( 'Add a title (optional)', 'p2026' ) }
					disabled={ isSaving }
				/>
			) }
			<BlockEditorProvider
				value={ blocks }
				onInput={ setBlocks }
				onChange={ setBlocks }
				settings={ EDITOR_SETTINGS }
			>
				<BlockEditorKeyboardShortcuts.Register />
				<BlockTools>
					<WritingFlow>
						<ObserveTyping>
							<div
								className="p2026-editor-canvas"
								role="textbox"
								aria-multiline="true"
								aria-label={ __( 'New post content', 'p2026' ) }
								tabIndex={ 0 }
								onClick={ onCanvasClick }
								onKeyDown={ onCanvasKeyDown }
							>
								<BlockList
									renderAppender={
										BlockList.ButtonBlockAppender
									}
								/>
							</div>
						</ObserveTyping>
					</WritingFlow>
				</BlockTools>
			</BlockEditorProvider>

			<div className="p2026-editor-toolbar">
				<Button
					variant="tertiary"
					onClick={ () => {
						setTitle( '' );
						setIsTitleEditing( false );
						setBlocks( [ createBlock( 'core/paragraph' ) ] );
					} }
					disabled={ isSaving }
				>
					{ __( 'Cancel', 'p2026' ) }
				</Button>
				<Button
					variant="primary"
					onClick={ onPublish }
					disabled={ isSaving }
					isBusy={ isSaving }
				>
					{ isSaving
						? __( 'Publishing…', 'p2026' )
						: __( 'Publish', 'p2026' ) }
				</Button>
			</div>
		</div>
	);
}
