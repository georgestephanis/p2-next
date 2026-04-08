/**
 * MarkdownCommentEditor — lightweight markdown editor for comment composition.
 */
import MDEditor from '@uiw/react-md-editor/nohighlight';
import '@uiw/react-md-editor/markdown-editor.css';
import { __ } from '@wordpress/i18n';

export default function MarkdownCommentEditor( {
	value,
	onChange,
	placeholder,
	label,
} ) {
	return (
		<div className="p2026-markdown-comment-editor" data-color-mode="light">
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
					'aria-label': label || __( 'Comment', 'p2026' ),
				} }
			/>
		</div>
	);
}
