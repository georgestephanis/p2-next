/**
 * MarkdownCommentEditor — lightweight markdown editor for comment composition.
 *
 * Uses @uiw/react-md-editor in edit mode only, so this behaves like a
 * markdown-aware textarea with toolbar controls and no preview pane.
 */
import MDEditor from '@uiw/react-md-editor/nohighlight';
import '@uiw/react-md-editor/markdown-editor.css';
import { __ } from '@wordpress/i18n';

export default function MarkdownCommentEditor( {
	value,
	onChange,
	placeholder,
} ) {
	return (
		<div
			className="p2026-markdown-comment-editor"
			data-color-mode="light"
		>
			<MDEditor
				value={ value }
				onChange={ ( nextValue ) => onChange( nextValue || '' ) }
				preview="edit"
				hideToolbar={ false }
				visibleDragbar={ false }
				height={ 220 }
				textareaProps={ {
					placeholder:
						placeholder || __( 'Write a comment…', 'p2026' ),
					'aria-label': __( 'Comment', 'p2026' ),
				} }
			/>
		</div>
	);
}
