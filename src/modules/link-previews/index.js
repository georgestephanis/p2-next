import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';
import { initLinkPreviewInteractivity } from '../../interactivity/link-previews';
import onDomReady from '../../utils/on-dom-ready';
import './_link-previews.scss';

const LINK_SELECTOR = 'a[href]:not(.p2026-mention)';
const DECORATED_CLASS = 'p2026-previewable-link';
const HOVER_DELAY_MS = 220;
const HIDE_DELAY_MS = 170;
const previewCache = new Map();

let cardEl = null;
let showTimer = null;
let hideTimer = null;
let activeAnchor = null;

function createUnavailablePreview( url ) {
	let targetLabel = '';
	try {
		const parsed = new URL( url );
		targetLabel = `${ parsed.host }${ parsed.pathname }${ parsed.search }${ parsed.hash }`;
	} catch {
		targetLabel = url;
	}

	return {
		type: 'unavailable',
		postTitle: __( 'Preview unavailable', 'p2026' ),
		excerpt: __(
			'This internal link cannot be previewed right now.',
			'p2026'
		),
		targetLabel,
		url,
	};
}

function toInternalAbsoluteUrl( href ) {
	try {
		const url = new URL( href, window.location.href );
		if ( url.origin !== window.location.origin ) {
			return null;
		}
		if ( url.protocol !== 'http:' && url.protocol !== 'https:' ) {
			return null;
		}
		return url.toString();
	} catch {
		return null;
	}
}

function isThreadContextLink( anchor ) {
	if ( ! anchor || ! anchor.closest ) {
		return false;
	}

	return Boolean(
		anchor.closest(
			'.wp-block-post-content, .entry-content, .comment-content, .wp-block-comment-content, .p2026-comments, .p2026-audit-log-viewer'
		)
	);
}

function decorateInternalLinks( root = document ) {
	const anchors = [];

	// If the root itself is an <a> matching our selector, include it.
	if ( root instanceof window.Element && root.matches( LINK_SELECTOR ) ) {
		anchors.push( root );
	}

	// Also include all matching descendant anchors.
	root.querySelectorAll( LINK_SELECTOR ).forEach( ( anchor ) => {
		anchors.push( anchor );
	} );

	anchors.forEach( ( anchor ) => {
		if ( anchor.classList.contains( DECORATED_CLASS ) ) {
			return;
		}

		if ( ! isThreadContextLink( anchor ) ) {
			return;
		}

		const absoluteUrl = toInternalAbsoluteUrl(
			anchor.getAttribute( 'href' )
		);
		if ( ! absoluteUrl ) {
			return;
		}

		anchor.classList.add( DECORATED_CLASS );
		anchor.dataset.p2026PreviewUrl = absoluteUrl;
	} );
}

async function fetchPreview( url ) {
	if ( previewCache.has( url ) ) {
		const cached = previewCache.get( url );
		return Promise.resolve( cached );
	}

	const request = apiFetch( {
		path: `/p2026/v1/link-preview?url=${ encodeURIComponent( url ) }`,
	} )
		.then( ( data ) => {
			// Cache the successful preview response for future hovers.
			previewCache.set( url, data );
			return data;
		} )
		.catch( ( error ) => {
			if ( error?.status === 404 || error?.status === 400 ) {
				const unavailable = createUnavailablePreview( url );
				// Cache the "unavailable" preview so we don't re-hit the endpoint.
				previewCache.set( url, unavailable );
				return unavailable;
			}
			// Evict failed promises so future calls can retry.
			previewCache.delete( url );
			throw error;
		} );

	// Cache the in-flight request so concurrent hovers share the same Promise.
	previewCache.set( url, request );
	return request;
}

function formatDate( isoDate ) {
	if ( ! isoDate ) {
		return '';
	}

	const date = new Date( isoDate );
	if ( Number.isNaN( date.getTime() ) ) {
		return '';
	}

	return new Intl.DateTimeFormat( undefined, {
		dateStyle: 'medium',
	} ).format( date );
}

function ensureCard() {
	if ( cardEl ) {
		return cardEl;
	}

	cardEl = document.createElement( 'aside' );
	cardEl.className = 'p2026-link-preview-card';
	cardEl.setAttribute( 'role', 'tooltip' );
	cardEl.hidden = true;

	cardEl.addEventListener( 'mouseenter', () => {
		if ( hideTimer ) {
			window.clearTimeout( hideTimer );
			hideTimer = null;
		}
	} );

	cardEl.addEventListener( 'mouseleave', () => {
		scheduleHide();
	} );

	document.body.appendChild( cardEl );
	return cardEl;
}

function renderCard( data ) {
	const card = ensureCard();
	card.innerHTML = '';
	card.classList.toggle( 'is-unavailable', data.type === 'unavailable' );

	const title = document.createElement( 'h4' );
	title.className = 'p2026-link-preview-title';
	title.textContent = data.postTitle || '';
	card.appendChild( title );

	if ( data.type === 'unavailable' ) {
		const note = document.createElement( 'p' );
		note.className = 'p2026-link-preview-note';
		note.textContent = data.excerpt || '';
		card.appendChild( note );

		if ( data.targetLabel ) {
			const target = document.createElement( 'p' );
			target.className = 'p2026-link-preview-target';
			target.textContent = data.targetLabel;
			card.appendChild( target );
		}
		return;
	}

	const meta = document.createElement( 'div' );
	meta.className = 'p2026-link-preview-meta';

	const avatar = document.createElement( 'img' );
	avatar.className = 'p2026-link-preview-avatar';
	avatar.src = data.authorAvatar || '';
	avatar.alt = '';
	avatar.loading = 'lazy';
	avatar.width = 28;
	avatar.height = 28;

	const byline = document.createElement( 'span' );
	const dateText = formatDate( data.date );
	const prefix = data.type === 'comment' ? __( 'Comment by', 'p2026' ) : '';
	const prefixText = prefix ? `${ prefix } ` : '';
	byline.textContent = dateText
		? `${ prefixText }${ data.authorName } · ${ dateText }`
		: `${ prefixText }${ data.authorName }`;

	meta.appendChild( avatar );
	meta.appendChild( byline );

	const excerpt = document.createElement( 'p' );
	excerpt.className = 'p2026-link-preview-excerpt';
	excerpt.textContent = data.excerpt || '';

	card.appendChild( meta );
	card.appendChild( excerpt );
}

function positionCard( anchor ) {
	const card = ensureCard();
	const anchorRect = anchor.getBoundingClientRect();
	const spacing = 10;

	card.hidden = false;

	const { width, height } = card.getBoundingClientRect();
	let left = anchorRect.left;
	let top = anchorRect.bottom + spacing;

	if ( left + width > window.innerWidth - 8 ) {
		left = window.innerWidth - width - 8;
	}
	if ( left < 8 ) {
		left = 8;
	}

	if ( top + height > window.innerHeight - 8 ) {
		top = anchorRect.top - height - spacing;
	}
	if ( top < 8 ) {
		top = 8;
	}

	card.style.left = `${ left }px`;
	card.style.top = `${ top }px`;
}

function hideCard() {
	activeAnchor = null;
	if ( showTimer ) {
		window.clearTimeout( showTimer );
		showTimer = null;
	}
	if ( cardEl ) {
		cardEl.hidden = true;
	}
}

function scheduleHide() {
	if ( hideTimer ) {
		window.clearTimeout( hideTimer );
	}
	hideTimer = window.setTimeout( () => {
		hideTimer = null;
		hideCard();
	}, HIDE_DELAY_MS );
}

function scheduleShow( anchor ) {
	const url = anchor.dataset.p2026PreviewUrl;
	if ( ! url ) {
		return;
	}

	activeAnchor = anchor;

	if ( hideTimer ) {
		window.clearTimeout( hideTimer );
		hideTimer = null;
	}
	if ( showTimer ) {
		window.clearTimeout( showTimer );
	}

	showTimer = window.setTimeout( async () => {
		showTimer = null;
		if ( activeAnchor !== anchor ) {
			return;
		}

		let preview = null;
		try {
			preview = await fetchPreview( url );
		} catch {
			return;
		}

		if ( ! preview || activeAnchor !== anchor ) {
			return;
		}

		renderCard( preview );
		positionCard( anchor );
	}, HOVER_DELAY_MS );
}

function onMouseOver( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	if ( event.target.closest( '.p2026-link-preview-card' ) ) {
		if ( hideTimer ) {
			window.clearTimeout( hideTimer );
			hideTimer = null;
		}
		return;
	}

	const anchor = event.target.closest( `a.${ DECORATED_CLASS }` );
	if ( anchor ) {
		scheduleShow( anchor );
	}
}

function onMouseOut( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	const fromCard = event.target.closest( '.p2026-link-preview-card' );
	if ( fromCard && ! fromCard.contains( event.relatedTarget ) ) {
		scheduleHide();
		return;
	}

	const anchor = event.target.closest( `a.${ DECORATED_CLASS }` );
	if ( anchor && ! anchor.contains( event.relatedTarget ) ) {
		scheduleHide();
	}
}

function onFocusIn( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	const anchor = event.target.closest( `a.${ DECORATED_CLASS }` );
	if ( anchor ) {
		scheduleShow( anchor );
	}
}

function onFocusOut( event ) {
	if ( ! ( event.target instanceof window.Element ) ) {
		return;
	}

	const anchor = event.target.closest( `a.${ DECORATED_CLASS }` );
	if ( anchor ) {
		scheduleHide();
	}
}

export function initLinkPreviews() {
	if ( window.__p2026LinkPreviewsMounted ) {
		return;
	}
	window.__p2026LinkPreviewsMounted = true;

	decorateInternalLinks( document );

	const observer = new window.MutationObserver( ( mutations ) => {
		for ( const mutation of mutations ) {
			mutation.addedNodes.forEach( ( node ) => {
				if ( ! ( node instanceof window.Element ) ) {
					return;
				}
				decorateInternalLinks( node );
			} );
		}
	} );

	observer.observe( document.body, {
		childList: true,
		subtree: true,
	} );

	initLinkPreviewInteractivity( {
		onMouseOver,
		onMouseOut,
		onFocusIn,
		onFocusOut,
		onWindowScroll: hideCard,
		onWindowResize: hideCard,
	} );
}

onDomReady( initLinkPreviews );
