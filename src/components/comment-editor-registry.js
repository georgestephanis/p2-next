import { createElement } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import MentionTextareaControl from '../modules/mentions/MentionTextareaControl';

const COMPONENT_FILTER = 'p2026.commentEditorComponent';
const FORMAT_FILTER = 'p2026.commentEditorFormat';

export function getCommentEditorComponent( context = {} ) {
	return applyFilters( COMPONENT_FILTER, MentionTextareaControl, context );
}

export function getCommentEditorFormat( context = {} ) {
	return applyFilters( FORMAT_FILTER, null, context );
}

export function renderCommentEditor( props, context = {} ) {
	const EditorComponent = getCommentEditorComponent( context );
	return createElement( EditorComponent, props );
}
