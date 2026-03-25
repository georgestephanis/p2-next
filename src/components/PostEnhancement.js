/**
 * PostEnhancement — per-post interactive layer mounted via a React portal.
 *
 * Injects a small container at the end of each theme-rendered post element,
 * then renders:
 *   • A "Comments (N)" toggle that expands the inline comment thread
 *   • An "Edit" button (for users with permission) that opens the inline editor
 */
import {
	useEffect,
	useRef,
	useCallback,
	createPortal,
} from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';

export default function PostEnhancement( { postId, postElement } ) {
	const mountRef = useRef( null );

	// Create a mount point inside the post element once.
	useEffect( () => {
		if ( ! postElement ) {
			return;
		}

		const el = document.createElement( 'div' );
		el.className = 'p2-next-post-enhancement';
		postElement.appendChild( el );
		mountRef.current = el;

		return () => el.remove();
	}, [ postElement ] );

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

	// Derive comment count: prefer the number already in the DOM to avoid
	// a flash of "0 comments" before the REST response arrives.
	const commentCount = isExpanded
		? comments.length
		: ( () => {
				const link = postElement.querySelector(
					'.comments-link, a[href*="#comments"]'
				);
				const match = link?.textContent?.match( /\d+/ );
				return match ? parseInt( match[ 0 ], 10 ) : 0;
		  } )();

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

	let commentLabel = `${ commentCount } ${ __( 'comments', 'p2-next' ) }`;
	if ( isExpanded ) {
		commentLabel = __( 'Hide comments', 'p2-next' );
	} else if ( commentCount === 1 ) {
		commentLabel = __( '1 comment', 'p2-next' );
	}

	if ( ! mountRef.current ) {
		return null;
	}

	return createPortal(
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

			{ isEditing && (
				<PostEditor postId={ postId } postElement={ postElement } />
			) }
			{ isExpanded && ! isEditing && <Comments postId={ postId } /> }
		</div>,
		mountRef.current
	);
}
