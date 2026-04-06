/**
 * Run a callback once the DOM is ready.
 *
 * Handles both cases where scripts run before and after DOMContentLoaded.
 *
 * @param {Function} callback Callback to execute when DOM is ready.
 */
export default function onDomReady( callback ) {
	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', callback, {
			once: true,
		} );
		return;
	}

	callback();
}
