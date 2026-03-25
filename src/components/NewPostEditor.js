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
import { Button } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';

// Minimal editor settings — disable features not needed on the frontend.
const EDITOR_SETTINGS = {
	hasFixedToolbar: true,
	focusMode: false,
	isRTL: document.documentElement.dir === 'rtl',
	__experimentalFeatures: {
		typography: { dropCap: false },
	},
};

export default function NewPostEditor() {
	const [ blocks, setBlocks ] = useState( [
		createBlock( 'core/paragraph' ),
	] );
	const { createPost } = useDispatch( STORE_NAME );
	const isSaving = useSelect( ( select ) =>
		select( STORE_NAME ).isSavingPost()
	);

	const onPublish = useCallback( async () => {
		if ( ! blocks.length ) {
			return;
		}
		await createPost( { blocks } );
		// Reset editor to a fresh paragraph after successful save.
		setBlocks( [ createBlock( 'core/paragraph' ) ] );
	}, [ blocks, createPost ] );

	return (
		<div className="p2-next-new-post-editor">
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
									'New post content',
									'p2-next'
								) }
							>
								<BlockList />
							</div>
						</ObserveTyping>
					</WritingFlow>
				</BlockTools>
			</BlockEditorProvider>

			<div className="p2-next-editor-toolbar">
				<Button
					variant="primary"
					onClick={ onPublish }
					disabled={ isSaving }
					isBusy={ isSaving }
				>
					{ isSaving
						? __( 'Publishing…', 'p2-next' )
						: __( 'Publish', 'p2-next' ) }
				</Button>
				<Button
					variant="tertiary"
					onClick={ () =>
						setBlocks( [ createBlock( 'core/paragraph' ) ] )
					}
					disabled={ isSaving }
				>
					{ __( 'Cancel', 'p2-next' ) }
				</Button>
			</div>
		</div>
	);
}
