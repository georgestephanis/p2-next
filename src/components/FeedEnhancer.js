/**
 * FeedEnhancer — root React component for the frontend enhancement layer.
 *
 * Owns all state (store subscription, polling) and renders:
 *   • A "N new posts" banner portal injected before the post list
 *   • A PostEnhancement portal injected into each existing post element
 *
 * New posts from polling are buffered and revealed on banner click, keeping
 * the theme in control of the initial server-rendered post display.
 *
 * When new posts arrive (via createPost or banner reveal), the current page
 * HTML is fetched and the server-rendered <li> for each post is extracted and
 * prepended directly into feedContainer. This keeps injected markup identical
 * to what the theme renders for existing posts. A fresh React root is then
 * mounted into each injected element to provide edit/comment controls.
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
import { setupPostToolbar } from '../enhancer';
import SearchWidget from './SearchWidget';
import UnreadBadge from './UnreadBadge';

// How long to poll (seconds). Read from the config injected by PHP if present.
const POLL_INTERVAL = window.p2026Config?.pollInterval ?? 15;
const COMMENT_REFRESH_BASE_INTERVAL = 20;
const COMMENT_REFRESH_JITTER = 8;
const COMMENT_REFRESH_MAX_BACKOFF = 8;
const COMMENT_REFRESH_BACKOFF_FACTOR = 2;
const COMMENT_REFRESH_CONCURRENCY = 3;

export default function FeedEnhancer( {
	feedContainer,
	postElements,
	isMainQuery = true,
} ) {
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

	// Container for the header widgets (search + unread badge).
	const headerContainerRef = useRef( null );

	useEffect( () => {
		if ( ! feedContainer || ! feedContainer.parentNode ) {
			return;
		}

		// Banner sits just before the post list.
		const banner = document.createElement( 'div' );
		banner.className = 'p2026-banner-container';
		feedContainer.parentNode.insertBefore( banner, feedContainer );
		bannerContainerRef.current = banner;

		return () => banner.remove();
	}, [ feedContainer ] );

	useEffect( () => {
		if ( ! isMainQuery || ! feedContainer || ! feedContainer.parentNode ) {
			return;
		}

		// Reuse a server-rendered header mount when available to avoid layout
		// shift on first paint. Fallback to creating it client-side.
		const parent = feedContainer.parentNode;
		const existingHeader = Array.from( parent.children ).find( ( node ) =>
			node.classList?.contains( 'p2026-header-container' )
		);

		if ( existingHeader ) {
			existingHeader.innerHTML = '';
			headerContainerRef.current = existingHeader;
			return;
		}

		const header = document.createElement( 'div' );
		header.className = 'p2026-header-container';
		parent.insertBefore( header, feedContainer );
		headerContainerRef.current = header;

		return () => header.remove();
	}, [ feedContainer, isMainQuery ] );

	// Tracks injected <li> elements by post ID.
	const newPostElsRef = useRef( {} );

	// Fetch the current post list on mount. This populates the store with post
	// objects (including comment_count) so PostEnhancement can show accurate
	// comment counts before the user ever expands a thread. The thunk also
	// sets lastFetched, so the polling interval only picks up posts newer
	// than this initial fetch.
	useEffect( () => {
		fetchPosts( { perPage: 20 } );
	}, [ fetchPosts ] );

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

	// IDs of posts the theme already rendered — never duplicate these.
	const staticIds = useMemo(
		() => new Set( postElements.map( ( { id } ) => id ) ),
		[ postElements ]
	);

	// Posts that arrived via createPost or revealed polling — not yet in the DOM.
	const newPosts = useMemo(
		() => storePosts.filter( ( p ) => ! staticIds.has( p.id ) ),
		[ storePosts, staticIds ]
	);

	// When new posts arrive, fetch the current page HTML and extract the
	// server-rendered <li> for each. Prepend into feedContainer so injected
	// markup is identical to what the theme renders. Mount a PostEnhancement
	// React root into each element for edit/comment controls.
	useEffect( () => {
		if ( ! newPosts.length || ! feedContainer ) {
			return;
		}

		const toInject = newPosts.filter(
			( p ) => ! newPostElsRef.current[ p.id ]
		);
		if ( ! toInject.length ) {
			return;
		}

		fetch( window.location.href )
			.then( ( r ) => r.text() )
			.then( ( html ) => {
				const doc = new window.DOMParser().parseFromString(
					html,
					'text/html'
				);

				// Prepend in reverse order so toInject[0] (newest) ends up first.
				[ ...toInject ].reverse().forEach( ( post ) => {
					if ( newPostElsRef.current[ post.id ] ) {
						return; // guard against concurrent fetches
					}

					const li = doc.querySelector(
						`.wp-block-post.post-${ post.id }`
					);
					if ( ! li ) {
						return; // post not found in rendered page (e.g. not published yet)
					}

					// Capture a reference group block from the live feed
					// before prepending, so we can sync layout classes
					// (e.g. has-global-padding) that may differ between
					// the initial PHP render and the re-fetched HTML.
					const referenceGroup = feedContainer.querySelector(
						'.wp-block-post > .wp-block-group'
					);

					feedContainer.prepend( li );
					newPostElsRef.current[ post.id ] = li;

					if ( referenceGroup ) {
						const injectedGroup = li.querySelector(
							':scope > .wp-block-group'
						);
						if ( injectedGroup ) {
							referenceGroup.classList.forEach( ( cls ) =>
								injectedGroup.classList.add( cls )
							);
						}
					}

					setupPostToolbar( post.id, li );
				} );
			} )
			.catch( () => {
				// Fetch failed — silently skip. The post is saved; a page
				// reload or the next poll cycle will surface it.
			} );
	}, [ newPosts, feedContainer ] );

	// Remove injected elements on teardown.
	useEffect( () => {
		const injected = newPostElsRef.current;
		return () => {
			Object.values( injected ).forEach( ( el ) => el.remove() );
		};
	}, [] );

	const onReveal = useCallback( () => {
		revealPendingPosts();
	}, [ revealPendingPosts ] );

	// Check if user is logged in; gate logged-in-only widgets to prevent 401s.
	const isLoggedIn = window.p2026Config?.currentUser;

	return (
		<>
			{ /* Header widgets portal — only for logged-in users */ }
			{ isLoggedIn &&
				headerContainerRef.current &&
				createPortal(
					<div className="p2026-header-widgets">
						<SearchWidget />
						<UnreadBadge />
					</div>,
					headerContainerRef.current
				) }
			{ /* Banner portal */ }
			{ bannerContainerRef.current &&
				createPortal(
					pendingCount > 0 ? (
						<div className="p2026-new-posts-banner">
							<Button variant="primary" onClick={ onReveal }>
								{ sprintf(
									/* translators: %d: number of new posts */
									_n(
										'%d new post — click to view',
										'%d new posts — click to view',
										pendingCount,
										'p2026'
									),
									pendingCount
								) }
							</Button>
						</div>
					) : null,
					bannerContainerRef.current
				) }
		</>
	);
}
