/**
 * PostEditor — inline block editor for editing an existing post.
 *
 * Fetches the post's raw content via the REST API (requires edit context),
 * parses it into blocks, and presents a BlockEditorProvider for editing.
 * Mounted as a portal inside the theme's existing post element.
 */
import { useState, useEffect, useCallback } from '@wordpress/element';
import { parse } from '@wordpress/blocks';
import { Button, Spinner, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import FrontendBlockEditorShell from './editor/FrontendBlockEditorShell';
import useCanvasBlockSelection from './editor/useCanvasBlockSelection';
import { getEditorSettings } from './editor/settings';

const EDITOR_SETTINGS = getEditorSettings();

export default function PostEditor( { postId, showTitleField = false } ) {
	const [ blocks, setBlocks ] = useState( null ); // null = loading
	const [ title, setTitle ] = useState( '' );
	const [ error, setError ] = useState( null );

	const { updatePost, setEditingPost } = useDispatch( STORE_NAME );
	const isSaving = useSelect(
		( select ) => select( STORE_NAME ).isSavingPost( postId ),
		[ postId ]
	);
	const { onCanvasClick, onCanvasKeyDown } = useCanvasBlockSelection();

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
			<FrontendBlockEditorShell
				blocks={ blocks }
				setBlocks={ setBlocks }
				settings={ EDITOR_SETTINGS }
				ariaLabel={ __( 'Edit post content', 'p2026' ) }
				onCanvasClick={ onCanvasClick }
				onCanvasKeyDown={ onCanvasKeyDown }
			/>

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
