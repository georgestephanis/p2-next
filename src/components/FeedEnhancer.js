/**
 * FeedEnhancer — root React component for the frontend enhancement layer.
 *
 * Owns all state (store subscription, polling) and renders:
 *   • A "N new posts" banner portal injected before the post list
 *   • A PostEnhancement portal injected into each existing post element
 *
 * New posts from polling are buffered and revealed on banner click, keeping
 * the theme in control of the initial server-rendered post display.
 */
import {
	useEffect,
	useRef,
	useCallback,
	createPortal,
	useMemo,
} from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import { Button } from '@wordpress/components';
import { sprintf, _n } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import { startPolling } from '../api';
import Post from './Post';
import PostEnhancement from './PostEnhancement';

// How long to poll (seconds). Read from the config injected by PHP if present.
const POLL_INTERVAL = window.p2NextConfig?.pollInterval ?? 15;
const COMMENT_REFRESH_BASE_INTERVAL = 20;
const COMMENT_REFRESH_JITTER = 8;
const COMMENT_REFRESH_MAX_BACKOFF = 8;
const COMMENT_REFRESH_BACKOFF_FACTOR = 2;
const COMMENT_REFRESH_CONCURRENCY = 3;

export default function FeedEnhancer( { feedContainer, postElements } ) {
	const { fetchPosts, pollForNewPosts, revealPendingPosts, fetchComments } =
		useDispatch( STORE_NAME );
	const pendingCount = useSelect( ( select ) =>
		select( STORE_NAME ).getPendingCount()
	);
	const storePosts = useSelect( ( select ) =>
		select( STORE_NAME ).getPosts()
	);
	const expandedPostIds = useSelect( ( select ) =>
		select( STORE_NAME ).getExpandedPosts()
	);

	// Container for the "new posts" banner — injected before the post list.
	const bannerContainerRef = useRef( null );
	// Container for new posts prepended above the existing list.
	const newPostsContainerRef = useRef( null );

	useEffect( () => {
		if ( ! feedContainer || ! feedContainer.parentNode ) {
			return;
		}

		// Banner sits just before the post list.
		const banner = document.createElement( 'div' );
		banner.className = 'p2-next-banner-container';
		feedContainer.parentNode.insertBefore( banner, feedContainer );
		bannerContainerRef.current = banner;

		// New-posts container sits between the banner and the existing list.
		const newPosts = document.createElement( 'div' );
		newPosts.className = 'p2-next-new-posts-container';
		feedContainer.parentNode.insertBefore( newPosts, feedContainer );
		newPostsContainerRef.current = newPosts;

		return () => {
			banner.remove();
			newPosts.remove();
		};
	}, [ feedContainer ] );

	// Seed lastFetched from the most recent post on the page so polling only
	// fetches posts newer than what's already visible.
	useEffect( () => {
		if ( ! postElements.length ) {
			return;
		}

		// The newest post's date is in its <time> element or data attribute.
		const firstPost = postElements[ 0 ]?.element;
		const time = firstPost?.querySelector( 'time[datetime]' );
		if ( time?.dateTime ) {
			// Manually set lastFetched in the store without triggering a full fetch.
			fetchPosts( { seedOnly: true, since: time.dateTime } );
		} else {
			fetchPosts( { seedOnly: true, since: new Date().toISOString() } );
		}
	}, [ fetchPosts, postElements ] );

	// Start polling.
	useEffect( () => {
		const stop = startPolling( () => pollForNewPosts(), POLL_INTERVAL, {
			minBackoffMultiplier: 1,
			maxBackoffMultiplier: 8,
			backoffFactor: 2,
		} );
		return stop;
	}, [ pollForNewPosts ] );

	// Refresh only expanded comment threads on a jittered timer so clients do
	// not all re-fetch comments at the same moment.
	useEffect( () => {
		let timeoutId;
		let cancelled = false;
		let backoffMultiplier = 1;

		const scheduleNext = () => {
			if ( cancelled ) {
				return;
			}
			const jitter =
				Math.floor( Math.random() * ( COMMENT_REFRESH_JITTER + 1 ) ) *
				1000;
			const backoffDelay =
				COMMENT_REFRESH_BASE_INTERVAL * 1000 * backoffMultiplier;
			timeoutId = window.setTimeout( runRefresh, backoffDelay + jitter );
		};

		const refreshInBatches = async ( postIds ) => {
			let hadError = false;
			for (
				let index = 0;
				index < postIds.length;
				index += COMMENT_REFRESH_CONCURRENCY
			) {
				const batch = postIds.slice(
					index,
					index + COMMENT_REFRESH_CONCURRENCY
				);
				const results = await Promise.allSettled(
					batch.map( ( postId ) => fetchComments( postId ) )
				);
				if (
					results.some( ( result ) => result.status === 'rejected' )
				) {
					hadError = true;
				}
			}
			return ! hadError;
		};

		const runRefresh = async () => {
			if ( cancelled ) {
				return;
			}

			let succeeded = true;
			if (
				document.visibilityState === 'visible' &&
				expandedPostIds.length > 0
			) {
				succeeded = await refreshInBatches( expandedPostIds );
			}

			if ( succeeded ) {
				backoffMultiplier = 1;
			} else {
				backoffMultiplier = Math.min(
					COMMENT_REFRESH_MAX_BACKOFF,
					backoffMultiplier * COMMENT_REFRESH_BACKOFF_FACTOR
				);
			}

			scheduleNext();
		};

		scheduleNext();

		return () => {
			cancelled = true;
			if ( timeoutId ) {
				window.clearTimeout( timeoutId );
			}
		};
	}, [ expandedPostIds, fetchComments ] );

	// IDs of posts the theme already rendered — we enhance those via portals
	// but never duplicate them in the new-posts container.
	const staticIds = useMemo(
		() => new Set( postElements.map( ( { id } ) => id ) ),
		[ postElements ]
	);

	// Posts that arrived via createPost or revealed polling — need full render.
	const newPosts = useMemo(
		() => storePosts.filter( ( p ) => ! staticIds.has( p.id ) ),
		[ storePosts, staticIds ]
	);

	const onReveal = useCallback( () => {
		revealPendingPosts();
	}, [ revealPendingPosts ] );

	return (
		<>
			{ /* Banner portal */ }
			{ bannerContainerRef.current &&
				createPortal(
					pendingCount > 0 ? (
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
					) : null,
					bannerContainerRef.current
				) }

			{ /* New posts — from createPost or revealed polling */ }
			{ newPostsContainerRef.current &&
				newPosts.length > 0 &&
				createPortal(
					newPosts.map( ( post ) => (
						<Post key={ post.id } post={ post } />
					) ),
					newPostsContainerRef.current
				) }

			{ /* Per-post enhancement portals */ }
			{ postElements.map( ( { id, element } ) => (
				<PostEnhancement
					key={ id }
					postId={ id }
					postElement={ element }
				/>
			) ) }
		</>
	);
}
