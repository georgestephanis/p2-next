/**
 * P2026 Module: Comment Editor.
 *
 * Registers pluggable comment editor behavior so this module can override
 * compose/edit surfaces only when active.
 */
import { addFilter } from '@wordpress/hooks';
import MarkdownCommentEditor from './MarkdownCommentEditor';

addFilter(
	'p2026.commentEditorComponent',
	'p2026/comment-editor/component',
	() => MarkdownCommentEditor
);

addFilter(
	'p2026.commentEditorFormat',
	'p2026/comment-editor/format',
	() => 'markdown'
);
