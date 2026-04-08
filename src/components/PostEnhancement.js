/**
 * PostEnhancement — per-post menu and interaction layer.
 *
 * Renders a three-dots trigger button in the top-right corner of the post
 * card (via position:absolute). Clicking it opens a <details>-based dropdown
 * that contains all post actions:
 *
 *   • Comments toggle  — available to everyone
 *   • Edit             — editors only
 *   • Copy link        — available to everyone
 *   • Delete           — editors only (destructive, styled in red)
 *
 * Comment threads expand below the post in normal document flow. The inline
 * Block Editor is portaled into a container inserted before the post content
 * so editing happens in-place.
 */
import {
	useEffect,
	useRef,
	useState,
	useCallback,
	useMemo,
	createPortal,
} from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __, _n, sprintf } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';
import { PostFooterMetaSlot } from '../slots/reactions';

const CONTENT_SELECTOR = '.wp-block-post-content, .entry-content';
const TITLE_SELECTOR =
	'.wp-block-post-title, .entry-title, .post-title, h1.wp-block-post-title, h2.wp-block-post-title, h1.entry-title, h2.entry-title';
const TRANSITION = 'height 0.25s ease, opacity 0.25s ease';

function isVisibleElement( el ) {
	if ( ! el ) {
		return false;
	}
	const style = window.getComputedStyle( el );
	return (
		style.display !== 'none' &&
		style.visibility !== 'hidden' &&
		style.opacity !== '0' &&
		el.offsetParent !== null
	);
}

function getPermalink( postElement ) {
	return (
		postElement.querySelector( '.wp-block-post-title a, a[rel="bookmark"]' )
			?.href ?? ''
	);
}

export default function PostEnhancement( {
	postId,
	postElement,
	initialCommentCount = null,
} ) {
	const {
		expandPost,
		collapsePost,
		setEditingPost,
		fetchComments,
		setPostState,
	} = useDispatch( STORE_NAME );

	const isExpanded = useSelect( ( s ) =>
		s( STORE_NAME ).isPostExpanded( postId )
	);
	const editingPost = useSelect( ( s ) => s( STORE_NAME ).getEditingPost() );
	const post = useSelect( ( s ) => s( STORE_NAME ).getPostById( postId ) );
	const comments = useSelect( ( s ) =>
		s( STORE_NAME ).getComments( postId )
	);
	// comment_count from the REST API post object — available once fetchPosts
	// runs on mount. Used as the display count before the thread is expanded.
	const storedCommentCount = useSelect( ( s ) =>
		s( STORE_NAME ).getPostCommentCount( postId )
	);
	const isEditing = editingPost === postId;
	const [ restCommentCount, setRestCommentCount ] = useState( null );
	const [ previewContributors, setPreviewContributors ] = useState( [] );

	const currentUser = window.p2026Config?.currentUser;
	const canEdit =
		currentUser && ( currentUser.canUpdatePosts || currentUser.canPublish );
	const commentsClosed = post?.comment_status === 'closed';
	const fallbackCanComment =
		( window.p2026Config?.canComment ?? !! currentUser ) &&
		! commentsClosed;
	const canCreateComments =
		typeof post?.p2026CanCreateComment === 'boolean'
			? post.p2026CanCreateComment
			: fallbackCanComment;

	const activeModules = window.p2026Config?.activeModules;
	const isPostStateActive =
		! Array.isArray( activeModules ) ||
		activeModules.includes( 'post-state' );

	// -----------------------------------------------------------------------
	// <details> open / close behaviour
	//
	// We attach outside-click and Escape listeners only while the menu is
	// open (via the toggle event) so there is no global listener overhead
	// on every post at rest.
	// -----------------------------------------------------------------------
	const detailsRef = useRef( null );

	// Some themes do not expose a server-rendered comments link count and the
	// posts endpoint may not include comment_count. In that case, fetch a single
	// comments page and read X-WP-Total for an accurate initial label.
	useEffect( () => {
		const knownCount =
			comments.length > 0 ||
			storedCommentCount > 0 ||
			( initialCommentCount ?? 0 ) > 0;

		if ( knownCount || restCommentCount !== null ) {
			return;
		}

		let cancelled = false;

		apiFetch( {
			path: `/wp/v2/comments?post=${ postId }&per_page=1&_fields=id`,
			parse: false,
		} )
			.then( ( response ) => {
				if ( cancelled ) {
					return;
				}

				const total = parseInt(
					response.headers.get( 'X-WP-Total' ) ?? '0',
					10
				);

				setRestCommentCount( Number.isNaN( total ) ? 0 : total );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setRestCommentCount( 0 );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [
		comments.length,
		storedCommentCount,
		initialCommentCount,
		restCommentCount,
		postId,
	] );

	const closeMenu = useCallback( () => {
		if ( detailsRef.current ) {
			detailsRef.current.open = false;
		}
	}, [] );

	// -----------------------------------------------------------------------
	// In-place editor: animate the theme content out and insert an editor
	// container in its place. On unmount, restore the content.
	// -----------------------------------------------------------------------
	const [ editorContainer, setEditorContainer ] = useState( null );
	const [ showTitleField, setShowTitleField ] = useState( false );
	const contentElRef = useRef( null );
	const savedHeightRef = useRef( 0 );
	const titleElRef = useRef( null );
	const titleWasHiddenRef = useRef( null );

	useEffect( () => {
		if ( ! postElement || ! isEditing ) {
			return;
		}

		const titleEl = postElement.querySelector( TITLE_SELECTOR );
		const hasVisibleTitle = isVisibleElement( titleEl );
		titleElRef.current = hasVisibleTitle ? titleEl : null;
		setShowTitleField( hasVisibleTitle );

		if ( hasVisibleTitle ) {
			titleWasHiddenRef.current = !! titleEl.hidden;
			titleEl.hidden = true;
		}

		const contentEl = postElement.querySelector( CONTENT_SELECTOR );
		contentElRef.current = contentEl;

		if ( contentEl ) {
			savedHeightRef.current = contentEl.scrollHeight;
			contentEl.style.height = savedHeightRef.current + 'px';
			contentEl.style.overflow = 'hidden';
			window.requestAnimationFrame( () => {
				contentEl.style.transition = TRANSITION;
				contentEl.style.height = '0';
				contentEl.style.opacity = '0';
			} );
		}

		const container = document.createElement( 'div' );
		container.className = 'p2026-editor-container';
		const anchorEl = hasVisibleTitle ? titleEl : contentEl;
		if ( anchorEl?.parentNode ) {
			anchorEl.parentNode.insertBefore( container, anchorEl );
		} else {
			postElement.appendChild( container );
		}
		setEditorContainer( container );

		return () => {
			const titleNode = titleElRef.current;
			if ( titleNode ) {
				titleNode.hidden = !! titleWasHiddenRef.current;
				titleElRef.current = null;
				titleWasHiddenRef.current = null;
			}
			setShowTitleField( false );

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
	// Menu actions
	// -----------------------------------------------------------------------
	// Prefer live fetched comments; otherwise use the REST post count, then the
	// server-rendered DOM count as a first-paint fallback.
	let commentCount = initialCommentCount ?? 0;
	if ( restCommentCount !== null ) {
		commentCount = restCommentCount;
	}
	if ( storedCommentCount > 0 ) {
		commentCount = storedCommentCount;
	}
	if ( comments.length > 0 ) {
		commentCount = comments.length;
	}

	// True while we have no reliable count from any source yet.
	// Avoids flashing "No comments yet" before the API responds.
	const isCountLoading =
		initialCommentCount === null &&
		storedCommentCount === 0 &&
		restCommentCount === null &&
		comments.length === 0;

	let commentLabel;
	if ( isExpanded ) {
		commentLabel = __( 'Hide comments', 'p2026' );
	} else if ( commentCount === 1 ) {
		commentLabel = __( '1 comment', 'p2026' );
	} else {
		commentLabel = `${ commentCount } ${ __( 'comments', 'p2026' ) }`;
	}

	const commentCountSummary = isCountLoading
		? null
		: commentCount > 0
		? sprintf(
				_n( '%d comment', '%d comments', commentCount, 'p2026' ),
				commentCount
		  )
		: __( 'No comments yet', 'p2026' );

	const contributorPreview = useMemo( () => {
		if ( comments.length > 0 ) {
			const seen = new Set();
			const unique = [];

			comments.forEach( ( commentItem ) => {
				const key = String(
					commentItem.author ||
						commentItem.author_name ||
						commentItem.id
				);
				if ( seen.has( key ) ) {
					return;
				}
				seen.add( key );
				unique.push( {
					id: key,
					name: commentItem.author_name || __( 'Someone', 'p2026' ),
					avatar:
						commentItem.author_avatar_urls?.[ '48' ] ||
						commentItem.author_avatar_urls?.[ 48 ] ||
						null,
				} );
			} );

			return unique.slice( 0, 3 );
		}

		return previewContributors;
	}, [ comments, previewContributors ] );

	const contributorOverflowCount = Math.max(
		0,
		commentCount - contributorPreview.length
	);

	useEffect( () => {
		if ( comments.length > 0 || commentCount < 1 ) {
			if ( comments.length > 0 && previewContributors.length > 0 ) {
				setPreviewContributors( [] );
			}
			return;
		}

		let cancelled = false;

		apiFetch( {
			path: `/wp/v2/comments?post=${ postId }&per_page=3&orderby=date&order=desc&_fields=id,author,author_name,author_avatar_urls`,
		} )
			.then( ( results ) => {
				if ( cancelled || ! Array.isArray( results ) ) {
					return;
				}

				const seen = new Set();
				const unique = [];

				results.forEach( ( commentItem ) => {
					const key = String(
						commentItem.author ||
							commentItem.author_name ||
							commentItem.id
					);
					if ( seen.has( key ) ) {
						return;
					}
					seen.add( key );
					unique.push( {
						id: key,
						name:
							commentItem.author_name || __( 'Someone', 'p2026' ),
						avatar:
							commentItem.author_avatar_urls?.[ '48' ] ||
							commentItem.author_avatar_urls?.[ 48 ] ||
							null,
					} );
				} );

				setPreviewContributors( unique.slice( 0, 3 ) );
			} )
			.catch( () => {
				if ( ! cancelled ) {
					setPreviewContributors( [] );
				}
			} );

		return () => {
			cancelled = true;
		};
	}, [ comments.length, commentCount, postId, previewContributors.length ] );

	const canViewDiscussion = commentCount > 0 || canCreateComments;
	let summaryActionLabel = commentCountSummary;
	if ( isExpanded ) {
		summaryActionLabel = __( 'Hide discussion', 'p2026' );
	} else if ( isCountLoading ) {
		summaryActionLabel = __( 'Loading comments…', 'p2026' );
	} else if ( commentsClosed ) {
		summaryActionLabel = __( 'View existing comments', 'p2026' );
	}

	const onToggleComments = useCallback( () => {
		closeMenu();
		if ( isExpanded ) {
			collapsePost( postId );
		} else {
			expandPost( postId );
			fetchComments( postId );
		}
	}, [
		isExpanded,
		postId,
		expandPost,
		collapsePost,
		fetchComments,
		closeMenu,
	] );

	const onEdit = useCallback( () => {
		closeMenu();
		setEditingPost( postId );
	}, [ postId, setEditingPost, closeMenu ] );

	const stateSlug = post?.p2026State?.slug ?? 'normal';
	let currentStateLabel = __( 'Normal', 'p2026' );
	if ( stateSlug === 'unresolved' ) {
		currentStateLabel = __( 'Unresolved', 'p2026' );
	} else if ( stateSlug === 'resolved' ) {
		currentStateLabel = __( 'Resolved', 'p2026' );
	}

	const onSetState = useCallback(
		( targetState ) => {
			closeMenu();
			setPostState( postId, targetState );
		},
		[ closeMenu, setPostState, postId ]
	);

	const [ copyLabel, setCopyLabel ] = useState( __( 'Copy link', 'p2026' ) );
	const onCopyLink = useCallback( async () => {
		closeMenu();
		const url = getPermalink( postElement );
		if ( ! url ) {
			return;
		}
		try {
			await window.navigator.clipboard.writeText( url );
		} catch {
			// Clipboard API unavailable — fall back to execCommand.
			const input = Object.assign( document.createElement( 'input' ), {
				value: url,
				style: 'position:fixed;opacity:0',
			} );
			document.body.appendChild( input );
			input.select();
			// eslint-disable-next-line no-undef
			document.execCommand( 'copy' );
			input.remove();
		}
		setCopyLabel( __( 'Copied!', 'p2026' ) );
		setTimeout( () => setCopyLabel( __( 'Copy link', 'p2026' ) ), 2000 );
	}, [ postElement, closeMenu ] );

	const onDelete = useCallback( async () => {
		closeMenu();
		// eslint-disable-next-line no-alert
		const confirmed = window.confirm(
			__( 'Move this post to the trash?', 'p2026' )
		);
		if ( ! confirmed ) {
			return;
		}
		try {
			await apiFetch( {
				path: `/wp/v2/posts/${ postId }`,
				method: 'DELETE',
			} );
			postElement.remove();
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( '[p2026] Delete failed', err );
		}
	}, [ postId, postElement, closeMenu ] );

	// -----------------------------------------------------------------------
	// Render
	// -----------------------------------------------------------------------
	return (
		<>
			{ /* Three-dots trigger + dropdown, absolutely positioned top-right */ }
			<details ref={ detailsRef } className="p2026-menu-wrap">
				<summary
					className="p2026-menu-trigger"
					aria-label={ __( 'Post actions', 'p2026' ) }
				>
					<span aria-hidden="true">&middot;&middot;&middot;</span>
				</summary>

				<ul className="p2026-menu-dropdown" role="menu">
					{ isPostStateActive && (
						<li role="none">
							<span className="p2026-menu-label">
								{ __( 'State:', 'p2026' ) }{ ' ' }
								{ currentStateLabel }
							</span>
						</li>
					) }

					<li role="none">
						<button
							type="button"
							role="menuitem"
							className="p2026-menu-item"
							onClick={ onToggleComments }
						>
							{ commentLabel }
						</button>
					</li>

					{ canEdit && ! isEditing && (
						<li role="none">
							<button
								type="button"
								role="menuitem"
								className="p2026-menu-item"
								onClick={ onEdit }
							>
								{ __( 'Edit', 'p2026' ) }
							</button>
						</li>
					) }

					{ isPostStateActive &&
						canEdit &&
						stateSlug === 'normal' && (
							<li role="none">
								<button
									type="button"
									role="menuitem"
									className="p2026-menu-item"
									onClick={ () => onSetState( 'unresolved' ) }
								>
									{ __( 'Flag as unresolved', 'p2026' ) }
								</button>
							</li>
						) }

					{ isPostStateActive &&
						canEdit &&
						stateSlug === 'unresolved' && (
							<>
								<li role="none">
									<button
										type="button"
										role="menuitem"
										className="p2026-menu-item"
										onClick={ () =>
											onSetState( 'resolved' )
										}
									>
										{ __( 'Mark resolved', 'p2026' ) }
									</button>
								</li>
								<li role="none">
									<button
										type="button"
										role="menuitem"
										className="p2026-menu-item"
										onClick={ () => onSetState( 'normal' ) }
									>
										{ __( 'Reset to normal', 'p2026' ) }
									</button>
								</li>
							</>
						) }

					{ isPostStateActive &&
						canEdit &&
						stateSlug === 'resolved' && (
							<>
								<li role="none">
									<button
										type="button"
										role="menuitem"
										className="p2026-menu-item"
										onClick={ () =>
											onSetState( 'unresolved' )
										}
									>
										{ __( 'Reopen', 'p2026' ) }
									</button>
								</li>
								<li role="none">
									<button
										type="button"
										role="menuitem"
										className="p2026-menu-item"
										onClick={ () => onSetState( 'normal' ) }
									>
										{ __( 'Reset to normal', 'p2026' ) }
									</button>
								</li>
							</>
						) }

					<li role="none">
						<button
							type="button"
							role="menuitem"
							className="p2026-menu-item"
							onClick={ onCopyLink }
						>
							{ copyLabel }
						</button>
					</li>

					{ canEdit && (
						<li role="none">
							<button
								type="button"
								role="menuitem"
								className="p2026-menu-item is-destructive"
								onClick={ onDelete }
							>
								{ __( 'Delete', 'p2026' ) }
							</button>
						</li>
					) }
				</ul>
			</details>

			{ /* Editor portaled into a container inserted before the content */ }
			{ isEditing &&
				editorContainer &&
				createPortal(
					<PostEditor
						postId={ postId }
						showTitleField={ showTitleField }
					/>,
					editorContainer
				) }

			{ ! isEditing && (
				<div className="p2026-comment-summary-bar">
					<div className="p2026-comment-summary-meta">
						<PostFooterMetaSlot fillProps={ { postId } } />
					</div>
					<button
						type="button"
						className="p2026-comment-summary-action"
						onClick={ onToggleComments }
						disabled={ ! isExpanded && ! canViewDiscussion }
					>
						<div className="p2026-comment-summary-main">
							<span
								className={ `p2026-comment-summary-count${
									! isCountLoading ? ' is-loaded' : ''
								}` }
							>
								{ summaryActionLabel }
							</span>
							{ ! isExpanded && contributorPreview.length > 0 && (
								<div className="p2026-comment-summary-contributors">
									<div
										className="p2026-comment-summary-avatars"
										aria-hidden="true"
									>
										{ contributorPreview.map(
											( contributor ) =>
												contributor.avatar ? (
													<img
														key={ contributor.id }
														className="p2026-comment-summary-avatar"
														src={ contributor.avatar }
														alt=""
														width={ 24 }
														height={ 24 }
													/>
												) : null
										) }
									</div>
									<span className="p2026-comment-summary-names">
										{ contributorPreview
											.map(
												( contributor ) => contributor.name
											)
											.join( ', ' ) }
									</span>
									{ contributorOverflowCount > 0 && (
										<span className="p2026-comment-summary-more">
											+{ contributorOverflowCount }
										</span>
									) }
								</div>
							) }
							{ ! isExpanded && commentsClosed && (
								<span className="p2026-comment-summary-note">
									{ commentCount > 0
										? __(
												'Replies are closed, but you can still read existing comments.',
												'p2026'
										  )
										: __(
												'Comments are closed for this post.',
												'p2026'
										  ) }
								</span>
							) }
						</div>
					</button>
				</div>
			) }

			{ /* Comment thread — renders in normal flow below the post content */ }
			{ isExpanded && ! isEditing && (
				<Comments
					postId={ postId }
					canCreateComments={ canCreateComments }
				/>
			) }
		</>
	);
}
