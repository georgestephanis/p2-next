/**
 * Post — single post card with inline comments toggle and edit action.
 */
import { useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';

export default function Post( { post } ) {
	const { expandPost, collapsePost, setEditingPost, fetchComments } =
		useDispatch( STORE_NAME );

	const isExpanded = useSelect( ( select ) =>
		select( STORE_NAME ).isPostExpanded( post.id )
	);
	const editingPost = useSelect( ( select ) =>
		select( STORE_NAME ).getEditingPost()
	);
	const isEditing = editingPost === post.id;

	const currentUser = window.p2NextConfig?.currentUser;
	const canEdit =
		currentUser &&
		( currentUser.id === post.author || currentUser.canPublish );

	const onToggleComments = useCallback( () => {
		if ( isExpanded ) {
			collapsePost( post.id );
		} else {
			expandPost( post.id );
			fetchComments( post.id );
		}
	}, [ isExpanded, post.id, expandPost, collapsePost, fetchComments ] );

	const onEdit = useCallback( () => {
		setEditingPost( post.id );
	}, [ post.id, setEditingPost ] );

	// Author from _embedded.
	const author = post._embedded?.author?.[ 0 ];
	const commentCount = post.comment_count ?? 0;

	return (
		<article className="p2-next-post" id={ `post-${ post.id }` }>
			<header className="p2-next-post-header">
				{ author && (
					<img
						className="p2-next-avatar"
						src={ author.avatar_urls?.[ 48 ] }
						alt={ author.name }
						width={ 48 }
						height={ 48 }
					/>
				) }
				<div className="p2-next-post-meta">
					<span className="p2-next-author">
						{ author?.name ?? __( 'Unknown', 'p2-next' ) }
					</span>
					<time
						className="p2-next-date"
						dateTime={ post.date_gmt }
						title={ post.date_gmt }
					>
						{ new Date( post.date_gmt + 'Z' ).toLocaleString() }
					</time>
				</div>

				{ canEdit && ! isEditing && (
					<Button
						className="p2-next-edit-btn"
						variant="tertiary"
						onClick={ onEdit }
						aria-label={ __( 'Edit post', 'p2-next' ) }
					>
						{ __( 'Edit', 'p2-next' ) }
					</Button>
				) }
			</header>

			{ post.title?.rendered && (
				<h2
					className="p2-next-post-title"
					dangerouslySetInnerHTML={ { __html: post.title.rendered } }
				/>
			) }

			{ isEditing ? (
				<PostEditor postId={ post.id } />
			) : (
				<div
					className="p2-next-post-content"
					dangerouslySetInnerHTML={ {
						__html: post.content?.rendered ?? '',
					} }
				/>
			) }

			<footer className="p2-next-post-footer">
				<Button
					variant="link"
					onClick={ onToggleComments }
					aria-expanded={ isExpanded }
				>
					{ isExpanded
						? __( 'Hide comments', 'p2-next' )
						: sprintf(
								/* translators: %d: comment count */
								_n(
									'%d comment',
									'%d comments',
									commentCount,
									'p2-next'
								),
								commentCount
						  ) }
				</Button>
			</footer>

			{ isExpanded && <Comments postId={ post.id } /> }
		</article>
	);
}
