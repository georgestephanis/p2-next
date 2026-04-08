/**
 * Interactivity exports.
 *
 * Shared interactivity utilities that are imported across domains should be
 * exported from this file to keep pathing and ownership consistent.
 *
 * These exports are intentionally a classic-script bridge. The concrete
 * Interactivity API implementations are loaded via a script-module entrypoint.
 */
export {
	initAdminBarInteractivity,
	initLinkPreviewInteractivity,
	initMentionsHoverInteractivity,
	initPostMenuInteractivity,
	initReactionsInteractivity,
	registerPollingVisibilityCallback,
} from './client-bridge';
