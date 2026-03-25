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
import { Button, Spinner } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

const EDITOR_SETTINGS = {
	hasFixedToolbar: false,
	focusMode: false,
	isRTL: document.documentElement.dir === 'rtl',
};

export default function PostEditor( { postId } ) {
	const [ blocks, setBlocks ] = useState( null ); // null = loading
	const [ error, setError ] = useState( null );

	const { updatePost, setEditingPost } = useDispatch( STORE_NAME );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingPost()
	);

	// Fetch raw post content for editing (requires ?context=edit).
	useEffect( () => {
		apiFetch( { path: `/wp/v2/posts/${ postId }?context=edit` } )
			.then( ( post ) => setBlocks( parse( post.content?.raw ?? '' ) ) )
			.catch( ( err ) =>
				setError(
					err.message ?? __( 'Could not load post.', 'p2-next' )
				)
			);
	}, [ postId ] );

	const onSave = useCallback( async () => {
		if ( ! blocks ) {
			return;
		}
		await updatePost( postId, { blocks } );
	}, [ postId, blocks, updatePost ] );

	const onCancel = useCallback( () => {
		setEditingPost( null );
	}, [ setEditingPost ] );

	if ( error ) {
		return <p className="p2-next-error">{ error }</p>;
	}

	if ( blocks === null ) {
		return <Spinner />;
	}

	return (
		<div className="p2-next-post-editor">
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
								className="p2-next-editor-canvas"
								role="textbox"
								aria-multiline="true"
								aria-label={ __(
									'Edit post content',
									'p2-next'
								) }
							>
								<BlockList renderAppender={ BlockList.ButtonBlockAppender } />
							</div>
						</ObserveTyping>
					</WritingFlow>
				</BlockTools>
			</BlockEditorProvider>

			<div className="p2-next-editor-toolbar">
				<Button
					variant="tertiary"
					onClick={ onCancel }
					disabled={ isSaving }
				>
					{ __( 'Cancel', 'p2-next' ) }
				</Button>
				<Button
					variant="primary"
					onClick={ onSave }
					disabled={ isSaving }
					isBusy={ isSaving }
				>
					{ isSaving
						? __( 'Saving…', 'p2-next' )
						: __( 'Update', 'p2-next' ) }
				</Button>
			</div>
		</div>
	);
}
