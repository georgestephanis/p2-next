/**
 * P2026 modules — side-effect imports for active modules.
 *
 * Modules are loaded based on window.p2026Config.activeModules, which is
 * managed by PHP. This prevents the frontend from mounting components for
 * modules explicitly disabled via the p2026_disabled_modules option.
 *
 * Add a new module by creating src/modules/{name}/index.js. Active modules
 * are computed server-side as discovered modules minus disabled modules.
 */

// Get list of active modules from server-provided config.
const activeModules =
	typeof window !== 'undefined' &&
	window.p2026Config &&
	Array.isArray( window.p2026Config.activeModules )
		? window.p2026Config.activeModules
		: null;

// If activeModules is not provided (null), fallback to loading all modules.
// This maintains backwards compatibility if config is not injected.
if ( ! activeModules ) {
	import( /* webpackChunkName: "mentions" */ './mentions' );
	import( /* webpackChunkName: "notifications" */ './notifications' );
} else {
	// Only load modules that are in the active list.
	if ( activeModules.includes( 'mentions' ) ) {
		import( /* webpackChunkName: "mentions" */ './mentions' );
	}
	if ( activeModules.includes( 'notifications' ) ) {
		import( /* webpackChunkName: "notifications" */ './notifications' );
	}
}
