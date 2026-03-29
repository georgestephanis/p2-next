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
	createPortal,
} from '@wordpress/element';
import { useDispatch, useSelect } from '@wordpress/data';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import Comments from './Comments';
import PostEditor from './PostEditor';

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

	const currentUser = window.p2026Config?.currentUser;
	const canEdit =
		currentUser && ( currentUser.canUpdatePosts || currentUser.canPublish );

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

	useEffect( () => {
		const details = detailsRef.current;
		if ( ! details ) {
			return;
		}

		let removeListeners = null;
		let deferTimer = null;

		const onToggle = () => {
			if ( details.open ) {
				const outsideClick = ( e ) => {
					if ( ! details.contains( e.target ) ) {
						details.open = false;
					}
				};
				const onKeydown = ( e ) => {
					if ( e.key === 'Escape' ) {
						details.open = false;
					}
				};

				// Defer so the click that opened the menu doesn't immediately
				// close it via the outside-click handler.
				deferTimer = setTimeout( () => {
					deferTimer = null;
					document.addEventListener( 'click', outsideClick );
				} );
				document.addEventListener( 'keydown', onKeydown );

				removeListeners = () => {
					if ( deferTimer ) {
						clearTimeout( deferTimer );
						deferTimer = null;
					}
					document.removeEventListener( 'click', outsideClick );
					document.removeEventListener( 'keydown', onKeydown );
				};
			} else {
				removeListeners?.();
				removeListeners = null;
			}
		};

		details.addEventListener( 'toggle', onToggle );
		return () => {
			details.removeEventListener( 'toggle', onToggle );
			removeListeners?.();
		};
	}, [] );

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
	if ( storedCommentCount > 0 ) {
		commentCount = storedCommentCount;
	}
	if ( comments.length > 0 ) {
		commentCount = comments.length;
	}
	let commentLabel;
	if ( isExpanded ) {
		commentLabel = __( 'Hide comments', 'p2026' );
	} else if ( commentCount === 1 ) {
		commentLabel = __( '1 comment', 'p2026' );
	} else {
		commentLabel = `${ commentCount } ${ __( 'comments', 'p2026' ) }`;
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

			{ /* Comment thread — renders in normal flow below the post content */ }
			{ isExpanded && ! isEditing && <Comments postId={ postId } /> }
		</>
	);
}
