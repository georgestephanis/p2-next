/**
 * Hovercard — floating profile card shown when hovering a .p2026-mention link.
 *
 * Architecture:
 *   - Module-level `showHovercard(user, anchorEl)` / `hideHovercard()` functions
 *     let non-React code (event delegation in index.js) drive visibility.
 *   - A single `HovercardHost` component is mounted once to a portal div on
 *     the body; it holds the React state and renders the card.
 *   - Position is calculated relative to the anchor element's bounding rect
 *     and adjusted to stay within the viewport after the card has rendered.
 */
import { useState, useEffect, useRef } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';

// ---------------------------------------------------------------------------
// Module-level controller — bridge between vanilla JS event code and React
// ---------------------------------------------------------------------------

let _controller = null;

/**
 * Register the hovercard controller (called once by HovercardHost on mount).
 *
 * @param {{ show: Function, hide: Function }|null} controller
 */
export function setHovercardController( controller ) {
	_controller = controller;
}

/**
 * Show the hovercard for the given user anchored to anchorEl.
 *
 * @param {Object}  user     Profile data { id, slug, name, bio, avatar_url, profile_url, post_count }.
 * @param {Element} anchorEl The .p2026-mention link element being hovered.
 */
export function showHovercard( user, anchorEl ) {
	_controller?.show( user, anchorEl );
}

/** Hide the hovercard. */
export function hideHovercard() {
	_controller?.hide();
}

// ---------------------------------------------------------------------------
// Hovercard card UI
// ---------------------------------------------------------------------------

/**
 * @param {Object}  props
 * @param {Object}  props.user     User profile object.
 * @param {Element} props.anchorEl DOM element to position below.
 */
function Hovercard( { user, anchorEl } ) {
	const cardRef = useRef( null );
	const anchorRect = anchorEl.getBoundingClientRect();

	// Start invisible; adjust position after measuring the rendered card.
	const [ style, setStyle ] = useState( {
		top: anchorRect.bottom + 8,
		left: anchorRect.left,
		opacity: 0,
	} );

	useEffect( () => {
		const card = cardRef.current;
		if ( ! card ) {
			return;
		}
		const cardRect = card.getBoundingClientRect();
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		let top = anchorRect.bottom + 8;
		let left = anchorRect.left;

		// Keep right edge inside the viewport.
		if ( left + cardRect.width > vw - 8 ) {
			left = Math.max( 8, vw - cardRect.width - 8 );
		}

		// If there's not enough room below, flip above.
		if ( top + cardRect.height > vh - 8 ) {
			top = anchorRect.top - cardRect.height - 8;
		}

		setStyle( { top, left, opacity: 1 } );
		// anchorRect values are stable for this render; list them to satisfy deps.
	}, [ anchorRect.bottom, anchorRect.left, anchorRect.top ] );

	return (
		<div
			ref={ cardRef }
			className="p2026-hovercard"
			style={ { position: 'fixed', ...style } }
			role="region"
			aria-label={ __( 'User profile', 'p2026' ) }
		>
			<div className="p2026-hovercard__header">
				{ user.avatar_url && (
					<img
						className="p2026-hovercard__avatar"
						src={ user.avatar_url }
						alt=""
						width={ 48 }
						height={ 48 }
						aria-hidden="true"
					/>
				) }
				<div className="p2026-hovercard__identity">
					<div className="p2026-hovercard__name">{ user.name }</div>
					<div className="p2026-hovercard__slug">@{ user.slug }</div>
				</div>
			</div>

			{ user.bio && <p className="p2026-hovercard__bio">{ user.bio }</p> }

			<div className="p2026-hovercard__meta">
				{ sprintf(
					/* translators: %d: number of posts */
					_n( '%d post', '%d posts', user.post_count, 'p2026' ),
					user.post_count
				) }
			</div>

			<a className="p2026-hovercard__link" href={ user.profile_url }>
				{ __( 'View profile', 'p2026' ) } &rarr;
			</a>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Host — mounted once to body; owns the visible/hidden state
// ---------------------------------------------------------------------------

/**
 * Mount once to a portal div on the body. Registers itself as the controller
 * so `showHovercard` / `hideHovercard` can drive it from outside React.
 */
export default function HovercardHost() {
	const [ entry, setEntry ] = useState( null ); // { user, anchorEl } | null

	useEffect( () => {
		setHovercardController( {
			show: ( user, anchorEl ) => setEntry( { user, anchorEl } ),
			hide: () => setEntry( null ),
		} );
		return () => setHovercardController( null );
	}, [] );

	if ( ! entry ) {
		return null;
	}

	return <Hovercard user={ entry.user } anchorEl={ entry.anchorEl } />;
}
