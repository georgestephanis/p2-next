/**
 * PostEditor — inline block editor for editing an existing post.
 *
 * Fetches the post's raw content via the REST API (requires edit context),
 * parses it into blocks, and presents a BlockEditorProvider for editing.
 * Mounted as a portal inside the theme's existing post element.
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	ObserveTyping,
	BlockEditorKeyboardShortcuts,
} from '@wordpress/block-editor';
import { parse } from '@wordpress/blocks';
import { Button, Spinner, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

const EDITOR_SETTINGS = {
	hasFixedToolbar: false,
	focusMode: false,
	isRTL: document.documentElement.dir === 'rtl',
};

export default function PostEditor( { postId, showTitleField = false } ) {
	const [ blocks, setBlocks ] = useState( null ); // null = loading
	const [ title, setTitle ] = useState( '' );
	const [ error, setError ] = useState( null );

	const { updatePost, setEditingPost } = useDispatch( STORE_NAME );
	const { selectBlock } = useDispatch( 'core/block-editor' );
	const isSaving = useSelect(
		( select ) => select( STORE_NAME ).isSavingPost( postId ),
		[ postId ]
	);

	// Fetch raw post content for editing (requires ?context=edit).
	useEffect( () => {
		apiFetch( { path: `/wp/v2/posts/${ postId }?context=edit` } )
			.then( ( post ) => {
				setTitle( post.title?.raw ?? '' );
				setBlocks( parse( post.content?.raw ?? '' ) );
			} )
			.catch( ( err ) =>
				setError( err.message ?? __( 'Could not load post.', 'p2026' ) )
			);
	}, [ postId ] );

	const onSave = useCallback( async () => {
		if ( ! blocks ) {
			return;
		}
		await updatePost( postId, { blocks, title } );
	}, [ postId, blocks, updatePost, title ] );

	const onCancel = useCallback( () => {
		setEditingPost( null );
	}, [ setEditingPost ] );

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

	if ( error ) {
		return <p className="p2026-error">{ error }</p>;
	}

	if ( blocks === null ) {
		return <Spinner />;
	}

	return (
		<div className="p2026-post-editor">
			{ showTitleField && (
				<TextControl
					label={ __( 'Title', 'p2026' ) }
					value={ title }
					onChange={ setTitle }
					className="p2026-editor-title"
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
								aria-label={ __(
									'Edit post content',
									'p2026'
								) }
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
					onClick={ onCancel }
					disabled={ isSaving }
				>
					{ __( 'Cancel', 'p2026' ) }
				</Button>
				<Button
					variant="primary"
					onClick={ onSave }
					disabled={ isSaving }
					isBusy={ isSaving }
				>
					{ isSaving
						? __( 'Saving…', 'p2026' )
						: __( 'Update', 'p2026' ) }
				</Button>
			</div>
		</div>
	);
}
