/**
 * P2026 Reactions Module
 *
 * Frontend reactions UI, REST API integration, and state management.
 */

export { useReactions } from './hooks';
export { default as ReactionUI } from './ReactionUI';
export { default as ReactionButton } from './ReactionButton';
export { default as ReactionPicker } from './ReactionPicker';
export { default as ParticipantList } from './ParticipantList';
export { default as PostReactionsWrapper } from './PostReactionsWrapper';
export { default as CommentReactionsWrapper } from './CommentReactionsWrapper';

import { createRoot } from '@wordpress/element';
import onDomReady from '../../utils/on-dom-ready';
import PostReactionsWrapper from './PostReactionsWrapper';
import CommentReactionsWrapper from './CommentReactionsWrapper';
import './_reaction-ui.scss';
import './_reaction-picker.scss';
import './_participant-list.scss';

/**
 * Get reactions configuration from server.
 *
 * @return {Object} Configuration with mode and available emoji.
 */
function getReactionsConfig() {
	return window.p2026Config?.reactionsConfig || {
		mode: 'single',
		emoji: [ '👍' ],
	};
}

/**
 * Check if user can react (has permission).
 *
 * @return {boolean}
 */
function canUserReact() {
	return (
		!! window.p2026Config?.currentUser ||
		! window.p2026Config?.requireNameEmail ||
		( window.p2026Config?.canComment ?? true )
	);
}

/**
 * Initialize reactions module and mount components on posts/comments.
 *
 * Called by the main frontend module bootstrap.
 */
export const initReactionsModule = () => {
	const config = getReactionsConfig();
	const canReact = canUserReact();

	if ( ! canReact ) {
		return;
	}

	onDomReady( () => {
		// Mount on posts.
		document.querySelectorAll( 'article[id^="post-"]' ).forEach( ( el ) => {
			const match = el.id.match( /post-(\d+)/ );
			if ( ! match ) {
				return;
			}

			const postId = parseInt( match[ 1 ], 10 );

			// Find or create a reactions mount point.
			let reactionsContainer = el.querySelector(
				'.p2026-reactions-mount'
			);
			if ( ! reactionsContainer ) {
				reactionsContainer = document.createElement( 'div' );
				reactionsContainer.className = 'p2026-reactions-mount';

				// Insert at the end of the article.
				el.appendChild( reactionsContainer );
			}

			// Mount React component.
			try {
				const root = createRoot( reactionsContainer );
				root.render(
					<PostReactionsWrapper postId={ postId } />
				);
			} catch ( err ) {
				if ( window.p2026Config?.debugTelemetry ) {
					console.error(
						'Failed to mount post reactions',
						err
					);
				}
			}
		} );

		// Mount on comments (if already expanded).
		document.querySelectorAll( 'li[id^="comment-"]' ).forEach( ( el ) => {
			const match = el.id.match( /comment-(\d+)/ );
			if ( ! match ) {
				return;
			}

			const commentId = parseInt( match[ 1 ], 10 );

			// Find or create a reactions mount point.
			let reactionsContainer = el.querySelector(
				'.p2026-reactions-mount'
			);
			if ( ! reactionsContainer ) {
				reactionsContainer = document.createElement( 'div' );
				reactionsContainer.className = 'p2026-reactions-mount';

				// Insert at the end of the comment.
				el.appendChild( reactionsContainer );
			}

			// Mount React component.
			try {
				const root = createRoot( reactionsContainer );
				root.render(
					<CommentReactionsWrapper
						commentId={ commentId }
					/>
				);
			} catch ( err ) {
				if ( window.p2026Config?.debugTelemetry ) {
					console.error(
						'Failed to mount comment reactions',
						err
					);
				}
			}
		} );
	} );
};

// Initialize on module load.
initReactionsModule();
