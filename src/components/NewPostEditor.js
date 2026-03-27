/**
 * NewPostEditor — embeds a minimal block editor on the frontend.
 *
 * Uses BlockEditorProvider + BlockList from @wordpress/block-editor so the
 * user gets the full block-authoring experience without the admin chrome.
 */
import { useState, useCallback } from '@wordpress/element';
import { createBlock } from '@wordpress/blocks';
import { Button, TextControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import FrontendBlockEditorShell from './editor/FrontendBlockEditorShell';
import useCanvasBlockSelection from './editor/useCanvasBlockSelection';
import { getEditorSettings } from './editor/settings';

// Minimal editor settings — disable features not needed on the frontend.
const EDITOR_SETTINGS = getEditorSettings( {
	__experimentalFeatures: {
		typography: { dropCap: false },
	},
} );

export default function NewPostEditor( { onAfterPublish } ) {
	const [ title, setTitle ] = useState( '' );
	const [ isTitleEditing, setIsTitleEditing ] = useState( false );
	const [ blocks, setBlocks ] = useState( [
		createBlock( 'core/paragraph' ),
	] );
	const { createPost } = useDispatch( STORE_NAME );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingPost( 'new' )
	);
	const { onCanvasClick, onCanvasKeyDown } = useCanvasBlockSelection();

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
			<FrontendBlockEditorShell
				blocks={ blocks }
				setBlocks={ setBlocks }
				settings={ EDITOR_SETTINGS }
				ariaLabel={ __( 'New post content', 'p2026' ) }
				onCanvasClick={ onCanvasClick }
				onCanvasKeyDown={ onCanvasKeyDown }
			/>

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
