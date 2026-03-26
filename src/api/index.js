/**
 * P2026 — API bootstrap.
 *
 * Configures @wordpress/api-fetch middleware using the runtime config injected
 * by p2026.php. Import this module once (from a view.js entry point) before
 * making any apiFetch calls.
 */
import apiFetch from '@wordpress/api-fetch';

let initialised = false;
let telemetryInitialised = false;

function normalisePath( path = '' ) {
	// Collapse numeric IDs to keep telemetry groupings stable.
	return path.replace( /\/\d+(?=\/|$|\?)/g, '/:id' );
}

function initTelemetry() {
	if ( telemetryInitialised ) {
		return;
	}
	telemetryInitialised = true;

	const buckets = new Map();

	apiFetch.use( async ( options, next ) => {
		const method = ( options?.method ?? 'GET' ).toUpperCase();
		const path = normalisePath(
			options?.path ?? options?.url ?? 'unknown'
		);
		const key = `${ method } ${ path }`;
		buckets.set( key, ( buckets.get( key ) ?? 0 ) + 1 );

		return next( options );
	} );

	window.setInterval( () => {
		if ( buckets.size === 0 ) {
			return;
		}

		const summary = [ ...buckets.entries() ]
			.sort( ( a, b ) => b[ 1 ] - a[ 1 ] )
			.map( ( [ key, count ] ) => `${ key } = ${ count }/min` )
			.join( ', ' );

		// eslint-disable-next-line no-console
		console.info( `[p2026 telemetry] ${ summary }` );
		buckets.clear();
	}, 60 * 1000 );
}

export function initApiFetch() {
	if ( initialised ) {
		return;
	}
	initialised = true;

	const { nonce, restUrl, debugTelemetry } = window.p2026Config ?? {};

	if ( restUrl ) {
		apiFetch.use( apiFetch.createRootURLMiddleware( restUrl ) );
	}
	if ( nonce ) {
		apiFetch.use( apiFetch.createNonceMiddleware( nonce ) );
	}

	if ( debugTelemetry ) {
		initTelemetry();
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
