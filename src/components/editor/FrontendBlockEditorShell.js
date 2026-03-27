import {
	BlockEditorProvider,
	BlockList,
	BlockTools,
	WritingFlow,
	ObserveTyping,
	BlockEditorKeyboardShortcuts,
} from '@wordpress/block-editor';

// Shared shell for frontend block editing.
export default function FrontendBlockEditorShell( {
	blocks,
	setBlocks,
	settings,
	ariaLabel,
	onCanvasClick,
	onCanvasKeyDown,
} ) {
	return (
		<BlockEditorProvider
			value={ blocks }
			onInput={ setBlocks }
			onChange={ setBlocks }
			settings={ settings }
		>
			<BlockEditorKeyboardShortcuts.Register />
			<BlockTools>
				<WritingFlow>
					<ObserveTyping>
						<div
							className="p2026-editor-canvas"
							role="textbox"
							aria-multiline="true"
							aria-label={ ariaLabel }
							tabIndex={ 0 }
							onClick={ onCanvasClick }
							onKeyDown={ onCanvasKeyDown }
						>
							<BlockList
								renderAppender={ BlockList.ButtonBlockAppender }
							/>
						</div>
					</ObserveTyping>
				</WritingFlow>
			</BlockTools>
		</BlockEditorProvider>
	);
}
