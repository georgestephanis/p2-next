/**
 * PostEnhancement — React content for the active post's toolbar slot.
 *
 * When editing, the theme-rendered post content element is animated out and
 * a container div is inserted in its place. PostEditor is portaled into that
 * container so the editor appears where the content was. On close, the
 * content animates back in.
 */
import {
	useEffect,
	useRef,
	useState,
	useCallback,
	createPortal,
} from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';

const CONTENT_SELECTOR = '.wp-block-post-content, .entry-content';
const TRANSITION = 'height 0.25s ease, opacity 0.25s ease';

export default function PostEnhancement( { postId, postElement, onDeactivate } ) {
	const { expandPost, collapsePost, setEditingPost, fetchComments } =
		useDispatch( STORE_NAME );

	const isExpanded = useSelect( ( s ) =>
		s( STORE_NAME ).isPostExpanded( postId )
	);
	const editingPost = useSelect( ( s ) => s( STORE_NAME ).getEditingPost() );
	const comments = useSelect( ( s ) =>
		s( STORE_NAME ).getComments( postId )
	);
	const isEditing = editingPost === postId;

	const currentUser = window.p2NextConfig?.currentUser;
	const canEdit = currentUser?.canUpdatePosts ?? currentUser?.canPublish;

	// -----------------------------------------------------------------------
	// In-place editor: swap content element for an editor container.
	// -----------------------------------------------------------------------
	const [ editorContainer, setEditorContainer ] = useState( null );
	const contentElRef = useRef( null );
	const savedHeightRef = useRef( 0 );

	useEffect( () => {
		if ( ! postElement || ! isEditing ) {
			return;
		}

		const contentEl = postElement.querySelector( CONTENT_SELECTOR );
		contentElRef.current = contentEl;

		// Collapse the existing content element out.
		if ( contentEl ) {
			savedHeightRef.current = contentEl.scrollHeight;
			contentEl.style.height = savedHeightRef.current + 'px';
			contentEl.style.overflow = 'hidden';
			requestAnimationFrame( () => {
				contentEl.style.transition = TRANSITION;
				contentEl.style.height = '0';
				contentEl.style.opacity = '0';
			} );
		}

		// Insert an editor container div where the content was.
		const container = document.createElement( 'div' );
		container.className = 'p2-next-editor-container';
		if ( contentEl?.parentNode ) {
			contentEl.parentNode.insertBefore( container, contentEl );
		} else {
			postElement.appendChild( container );
		}
		setEditorContainer( container );

		return () => {
			// Restore the content element.
			const el = contentElRef.current;
			if ( el ) {
				el.style.transition = TRANSITION;
				el.style.height = savedHeightRef.current + 'px';
				el.style.opacity = '1';
				el.addEventListener(
					'transitionend',
					() => {
						el.style.cssText = '';
					},
					{ once: true }
				);
			}
			container.remove();
			setEditorContainer( null );
		};
	}, [ isEditing, postElement ] );

	// -----------------------------------------------------------------------
	// Deactivate once the user has finished everything.
	// -----------------------------------------------------------------------
	const wasActive = useRef( false );
	useEffect( () => {
		if ( isExpanded || isEditing ) {
			wasActive.current = true;
		} else if ( wasActive.current ) {
			onDeactivate?.();
		}
	}, [ isExpanded, isEditing, onDeactivate ] );

	// -----------------------------------------------------------------------
	// Comment label
	// -----------------------------------------------------------------------
	const commentCount = isExpanded ? comments.length : 0;
	let commentLabel = `${ commentCount } ${ __( 'comments', 'p2-next' ) }`;
	if ( isExpanded ) {
		commentLabel = __( 'Hide comments', 'p2-next' );
	} else if ( commentCount === 1 ) {
		commentLabel = __( '1 comment', 'p2-next' );
	}

	const onToggleComments = useCallback( () => {
		if ( isExpanded ) {
			collapsePost( postId );
		} else {
			expandPost( postId );
			fetchComments( postId );
		}
	}, [ isExpanded, postId, expandPost, collapsePost, fetchComments ] );

	const onEdit = useCallback( () => {
		setEditingPost( postId );
	}, [ postId, setEditingPost ] );

	return (
		<>
			<div className="p2-next-post-actions">
				<Button
					variant="link"
					className="p2-next-comments-toggle"
					onClick={ onToggleComments }
					aria-expanded={ isExpanded }
				>
					{ commentLabel }
				</Button>

				{ canEdit && ! isEditing && (
					<Button
						variant="link"
						className="p2-next-edit-btn"
						onClick={ onEdit }
					>
						{ __( 'Edit', 'p2-next' ) }
					</Button>
				) }
			</div>

			{ /* Editor portaled into the container inserted before the content */ }
			{ isEditing &&
				editorContainer &&
				createPortal(
					<PostEditor postId={ postId } />,
					editorContainer
				) }

			{ isExpanded && ! isEditing && <Comments postId={ postId } /> }
		</>
	);
}
