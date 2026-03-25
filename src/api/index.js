/**
 * P2 Next — API bootstrap.
 *
 * Configures @wordpress/api-fetch middleware using the runtime config injected
 * by p2-next.php. Import this module once (from a view.js entry point) before
 * making any apiFetch calls.
 */
import apiFetch from '@wordpress/api-fetch';

let initialised = false;

export function initApiFetch() {
	if ( initialised ) {
		return;
	}
	initialised = true;

	const { nonce, restUrl } = window.p2NextConfig ?? {};

	if ( restUrl ) {
		apiFetch.use( apiFetch.createRootURLMiddleware( restUrl ) );
	}
	if ( nonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
	}
}

/**
 * Start polling for new posts on a fixed interval.
 *
 * @param {Function} pollFn       Thunk dispatch call (e.g. dispatch( actions.pollForNewPosts() ))
 * @param {number}   intervalSecs Polling cadence in seconds.
 * @param {Object}   options      Backoff tuning options.
 * @return {Function} Cleanup function — call to stop polling.
 */
export function startPolling( pollFn, intervalSecs = 15, options = {} ) {
	const {
		minBackoffMultiplier = 1,
		maxBackoffMultiplier = 8,
		backoffFactor = 2,
	} = options;

	let timeoutId;
	let stopped = false;
	let backoffMultiplier = minBackoffMultiplier;

	const scheduleNext = () => {
		if ( stopped ) {
			return;
		}

		timeoutId = window.setTimeout(
			runPoll,
			intervalSecs * 1000 * backoffMultiplier
		);
	};

	const runPoll = async () => {
		if ( stopped || document.visibilityState !== 'visible' ) {
			scheduleNext();
			return;
		}

		try {
			await Promise.resolve( pollFn() );
			backoffMultiplier = minBackoffMultiplier;
		} catch ( error ) {
			backoffMultiplier = Math.min(
				maxBackoffMultiplier,
				Math.max(
					minBackoffMultiplier,
					backoffMultiplier * backoffFactor
				)
			);
		}

		scheduleNext();
	};

	// Poll immediately on visibility restore.
	const onVisible = () => {
		if ( document.visibilityState === 'visible' ) {
			if ( timeoutId ) {
				window.clearTimeout( timeoutId );
			}
			runPoll();
		}
	};

	document.addEventListener( 'visibilitychange', onVisible );
	scheduleNext();

	return () => {
		stopped = true;
		if ( timeoutId ) {
			window.clearTimeout( timeoutId );
		}
		document.removeEventListener( 'visibilitychange', onVisible );
	};
}
