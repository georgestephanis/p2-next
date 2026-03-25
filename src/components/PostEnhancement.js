/**
 * PostEnhancement — React content for the active post's toolbar slot.
 *
 * Rendered on demand by enhancer.js into the `.p2-next-post-react` slot
 * when the user interacts with a post's plain-DOM toolbar. Renders the
 * reactive versions of the action buttons plus any expanded content
 * (block editor or comment thread).
 *
 * Calls onDeactivate() once the user has closed everything, so enhancer.js
 * can unmount this root and restore the plain-DOM toolbar.
 */
import { useEffect, useRef, useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';

export default function PostEnhancement( { postId, onDeactivate } ) {
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

	// Track whether the user has actually opened anything. Once they have,
	// closing everything signals that React is done here.
	const wasActive = useRef( false );
	useEffect( () => {
		if ( isExpanded || isEditing ) {
			wasActive.current = true;
		} else if ( wasActive.current ) {
			onDeactivate?.();
		}
	}, [ isExpanded, isEditing, onDeactivate ] );

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

			{ isEditing && <PostEditor postId={ postId } /> }
			{ isExpanded && ! isEditing && <Comments postId={ postId } /> }
		</div>
	);
}
