/**
 * Reactions Interactivity Store.
 *
 * Manages reaction state and interactions via the WordPress Interactivity API.
 * This is loaded as a Script Module and exposed via the bridge API for
 * classic-bundle frontend code to consume.
 */

import { interactivityStore } from './runtime';

const NAMESPACE = 'p2026/reactions';

interactivityStore( NAMESPACE, {
	state: {
		// Reactions are keyed by object (post_id or comment_id with type prefix).
		// Value: { emoji => { emoji, count, users } }
		reactions: {},

		// User's own reactions, keyed by object.
		userReactions: {},

		// Loading states per object.
		loading: {},

		// Errors per object.
		errors: {},
	},

	selectors: {
		/**
		 * Get reactions for a specific object.
		 *
		 * @param {Object} state    Reactions state.
		 * @param {string} objectKey Object identifier (e.g., "post_123" or "comment_456").
		 * @return {Object} Reactions grouped by emoji.
		 */
		getReactions: ( state, objectKey ) => {
			return state.reactions[ objectKey ] || {};
		},

		/**
		 * Get user's reaction on an object.
		 *
		 * @param {Object} state    Reactions state.
		 * @param {string} objectKey Object identifier.
		 * @return {string|null} Current user's emoji reaction, or null.
		 */
		getUserReaction: ( state, objectKey ) => {
			return state.userReactions[ objectKey ] || null;
		},

		/**
		 * Check if reactions are loading for an object.
		 *
		 * @param {Object} state    Reactions state.
		 * @param {string} objectKey Object identifier.
		 * @return {boolean}
		 */
		isLoading: ( state, objectKey ) => {
			return state.loading[ objectKey ] === true;
		},

		/**
		 * Get error state for an object.
		 *
		 * @param {Object} state    Reactions state.
		 * @param {string} objectKey Object identifier.
		 * @return {Object|null}
		 */
		getError: ( state, objectKey ) => {
			return state.errors[ objectKey ] || null;
		},
	},

	actions: {
		/**
		 * Fetch reactions for an object.
		 *
		 * @param {Object} context   Store context.
		 * @param {Object} options   Options object.
		 * @param {number} options.objectId   Post or comment ID.
		 * @param {string} options.objectType 'post' or 'comment'.
		 * @return {Promise}
		 */
		async *fetchReactions( options ) {
			const { objectId, objectType } = options;
			const objectKey = `${ objectType }_${ objectId }`;

			this.state.loading[ objectKey ] = true;
			this.state.errors[ objectKey ] = null;

			try {
				const response = await window.wp.apiFetch( {
					path: `/p2026/v1/reactions?object_id=${ objectId }&object_type=${ objectType }`,
				} );

				this.state.reactions[ objectKey ] = response;
			} catch ( error ) {
				this.state.errors[ objectKey ] = error;
				console.error(
					`Failed to fetch reactions for ${ objectKey }`,
					error
				);
			} finally {
				this.state.loading[ objectKey ] = false;
			}
		},

		/**
		 * Add a reaction to an object.
		 *
		 * @param {Object} context   Store context.
		 * @param {Object} options   Options object.
		 * @param {number} options.objectId   Post or comment ID.
		 * @param {string} options.objectType 'post' or 'comment'.
		 * @param {string} options.emoji      Emoji to add.
		 * @return {Promise}
		 */
		async *addReaction( options ) {
			const { objectId, objectType, emoji } = options;
			const objectKey = `${ objectType }_${ objectId }`;

			this.state.loading[ objectKey ] = true;
			this.state.errors[ objectKey ] = null;

			try {
				await window.wp.apiFetch( {
					method: 'POST',
					path: '/p2026/v1/reactions',
					data: {
						object_id: objectId,
						object_type: objectType,
						emoji,
					},
				} );

				// Mark as the user's current reaction.
				this.state.userReactions[ objectKey ] = emoji;

				// Re-fetch to get updated counts.
				yield this.actions.fetchReactions( options );
			} catch ( error ) {
				this.state.errors[ objectKey ] = error;
				console.error(
					`Failed to add reaction for ${ objectKey }`,
					error
				);
			} finally {
				this.state.loading[ objectKey ] = false;
			}
		},

		/**
		 * Remove a reaction from an object.
		 *
		 * @param {Object} context   Store context.
		 * @param {Object} options   Options object.
		 * @param {number} options.objectId   Post or comment ID.
		 * @param {string} options.objectType 'post' or 'comment'.
		 * @param {string} options.emoji      Emoji to remove.
		 * @return {Promise}
		 */
		async *removeReaction( options ) {
			const { objectId, objectType, emoji } = options;
			const objectKey = `${ objectType }_${ objectId }`;

			this.state.loading[ objectKey ] = true;
			this.state.errors[ objectKey ] = null;

			try {
				await window.wp.apiFetch( {
					method: 'DELETE',
					path: `/p2026/v1/reactions?object_id=${ objectId }&object_type=${ objectType }&emoji=${ encodeURIComponent(
						emoji
					) }`,
				} );

				// Clear user's reaction.
				delete this.state.userReactions[ objectKey ];

				// Re-fetch to get updated counts.
				yield this.actions.fetchReactions( options );
			} catch ( error ) {
				this.state.errors[ objectKey ] = error;
				console.error(
					`Failed to remove reaction for ${ objectKey }`,
					error
				);
			} finally {
				this.state.loading[ objectKey ] = false;
			}
		},

		/**
		 * Clear error state for an object.
		 *
		 * @param {Object} context   Store context.
		 * @param {string} objectKey Object identifier.
		 */
		clearError( objectKey ) {
			delete this.state.errors[ objectKey ];
		},
	},
} );

/**
 * Initialize reactions interactivity.
 *
 * No directive-host wiring needed at the interactivity level; reactions
 * are managed via React components that call the store actions.
 */
export function initReactionsInteractivity() {
	// Reactions initialization is handled by React components via the store.
	// This function is a placeholder for future interactivity-specific logic
	// (e.g., polling, cache invalidation, etc).
}
