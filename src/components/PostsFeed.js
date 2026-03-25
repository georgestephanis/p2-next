/**
 * PostsFeed — live-updating list of posts.
 *
 * Fetches posts on mount, then polls for new ones on an interval.
 * New posts are buffered and surfaced via a "N new posts" banner
 * rather than auto-scrolling.
 */
import { useEffect, useCallback } from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { __, sprintf, _n } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import { startPolling } from '../api';
import Post from './Post';

export default function PostsFeed( { postsPerPage = 20, pollInterval = 15 } ) {
	const { fetchPosts, pollForNewPosts, revealPendingPosts } =
		useDispatch( STORE_NAME );

	const posts = useSelect( ( select ) => select( STORE_NAME ).getPosts() );
	const pendingCount = useSelect( ( select ) =>
		select( STORE_NAME ).getPendingCount()
	);

	// Initial fetch.
	useEffect( () => {
		fetchPosts( { perPage: postsPerPage } );
	}, [ fetchPosts, postsPerPage ] );

	// Start polling after first fetch resolves (lastFetched is set).
	useEffect( () => {
		const stop = startPolling( () => pollForNewPosts(), pollInterval );
		return stop;
	}, [ pollForNewPosts, pollInterval ] );

	const onReveal = useCallback( () => {
		revealPendingPosts();
		window.scrollTo( { top: 0, behavior: 'smooth' } );
	}, [ revealPendingPosts ] );

	return (
		<div className="p2-next-posts-feed">
			{ pendingCount > 0 && (
				<div className="p2-next-new-posts-banner">
					<Button variant="primary" onClick={ onReveal }>
						{ sprintf(
							/* translators: %d: number of new posts */
							_n(
								'%d new post — click to view',
								'%d new posts — click to view',
								pendingCount,
								'p2-next'
							),
							pendingCount
						) }
					</Button>
				</div>
			) }

			{ posts.length === 0 && (
				<p className="p2-next-no-posts">
					{ __( 'No posts yet. Be the first!', 'p2-next' ) }
				</p>
			) }

			{ posts.map( ( post ) => (
				<Post key={ post.id } post={ post } />
			) ) }
		</div>
	);
}
