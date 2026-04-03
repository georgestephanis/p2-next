import {
	render,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { Button, Notice, SelectControl, Spinner } from '@wordpress/components';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';

const formatTimestamp = ( value ) => {
	if ( ! value ) {
		return '';
	}

	const parsed = new Date( value );
	if ( Number.isNaN( parsed.getTime() ) ) {
		return value;
	}

	return parsed.toLocaleString( undefined, {
		dateStyle: 'medium',
		timeStyle: 'medium',
	} );
};

const buildUrl = ( base, params = {} ) => {
	const url = new URL( base );
	Object.entries( params ).forEach( ( [ key, value ] ) => {
		if ( undefined === value || null === value || '' === value ) {
			return;
		}
		url.searchParams.set( key, String( value ) );
	} );
	return url.toString();
};

const AuditLogViewerApp = ( { config } ) => {
	const [ days, setDays ] = useState( [] );
	const [ selectedDay, setSelectedDay ] = useState( '' );
	const [ isLoadingDays, setIsLoadingDays ] = useState( true );
	const [ isLoadingEntries, setIsLoadingEntries ] = useState( true );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ rawItems, setRawItems ] = useState( [] );
	const [ view, setView ] = useState( {
		type: 'table',
		perPage: 25,
		fields: [
			'timestamp',
			'event_type',
			'post_id',
			'actor_id',
			'source',
			'old_state',
			'new_state',
		],
		sort: {
			field: 'timestamp',
			direction: 'desc',
		},
	} );

	const fields = useMemo(
		() => [
			{
				id: 'timestamp',
				label: __( 'Timestamp', 'p2026' ),
				enableGlobalSearch: true,
				render: ( { item } ) => formatTimestamp( item.timestamp ),
			},
			{
				id: 'event_type',
				label: __( 'Event Type', 'p2026' ),
				enableGlobalSearch: true,
			},
			{
				id: 'post_id',
				label: __( 'Post ID', 'p2026' ),
				enableGlobalSearch: true,
			},
			{
				id: 'actor_id',
				label: __( 'Actor ID', 'p2026' ),
				enableGlobalSearch: true,
			},
			{
				id: 'source',
				label: __( 'Source', 'p2026' ),
				enableGlobalSearch: true,
			},
			{
				id: 'old_state',
				label: __( 'Old State', 'p2026' ),
				enableGlobalSearch: true,
			},
			{
				id: 'new_state',
				label: __( 'New State', 'p2026' ),
				enableGlobalSearch: true,
			},
		],
		[]
	);

	const loadDays = useCallback( async () => {
		setIsLoadingDays( true );
		setErrorMessage( '' );

		try {
			const response = await window.fetch(
				buildUrl( `${ config.restBase }/days` ),
				{
					headers: {
						'X-WP-Nonce': config.restNonce,
					},
				}
			);

			if ( ! response.ok ) {
				throw new Error( 'days-fetch-failed' );
			}

			const payload = await response.json();
			const fetchedDays = Array.isArray( payload.days )
				? payload.days
				: [];
			setDays( fetchedDays );

			if ( fetchedDays.length && ! selectedDay ) {
				setSelectedDay( fetchedDays[ 0 ] );
			}
		} catch ( error ) {
			setErrorMessage(
				__( 'Unable to load available log days.', 'p2026' )
			);
			setDays( [] );
		}

		setIsLoadingDays( false );
	}, [ config.restBase, config.restNonce, selectedDay ] );

	const loadEntries = useCallback( async () => {
		setIsLoadingEntries( true );
		setErrorMessage( '' );

		try {
			const response = await window.fetch(
				buildUrl( `${ config.restBase }/entries`, {
					day: selectedDay,
					per_page: 500,
					page: 1,
				} ),
				{
					headers: {
						'X-WP-Nonce': config.restNonce,
					},
				}
			);

			if ( ! response.ok ) {
				throw new Error( 'entries-fetch-failed' );
			}

			const payload = await response.json();
			setRawItems( Array.isArray( payload.items ) ? payload.items : [] );
		} catch ( error ) {
			setErrorMessage(
				__( 'Unable to load audit log entries.', 'p2026' )
			);
			setRawItems( [] );
		}

		setIsLoadingEntries( false );
	}, [ config.restBase, config.restNonce, selectedDay ] );

	useEffect( () => {
		void loadDays();
	}, [ loadDays ] );

	useEffect( () => {
		void loadEntries();
	}, [ loadEntries ] );

	const dayOptions = useMemo( () => {
		const options = [ { label: __( 'All Days', 'p2026' ), value: '' } ];
		days.forEach( ( day ) => {
			options.push( { label: day, value: day } );
		} );
		return options;
	}, [ days ] );

	const { data: processedData, paginationInfo } = useMemo(
		() => filterSortAndPaginate( rawItems, view, fields ),
		[ fields, rawItems, view ]
	);

	return (
		<div>
			<div
				style={ {
					display: 'flex',
					gap: '12px',
					alignItems: 'end',
					flexWrap: 'wrap',
					marginBottom: '12px',
				} }
			>
				<div style={ { minWidth: '240px' } }>
					<SelectControl
						label={ __( 'Log Day', 'p2026' ) }
						value={ selectedDay }
						options={ dayOptions }
						onChange={ ( value ) => setSelectedDay( value ) }
						disabled={ isLoadingDays }
					/>
				</div>
				<Button
					variant="secondary"
					onClick={ () => void loadEntries() }
					disabled={ isLoadingEntries }
				>
					{ __( 'Refresh Entries', 'p2026' ) }
				</Button>
			</div>

			{ isLoadingDays && (
				<p>
					<Spinner /> { __( 'Loading available days…', 'p2026' ) }
				</p>
			) }

			{ errorMessage && (
				<Notice status="error" isDismissible={ false }>
					{ errorMessage }
				</Notice>
			) }

			{ ! isLoadingEntries && ! errorMessage && rawItems.length === 0 && (
				<Notice status="info" isDismissible={ false }>
					{ selectedDay
						? sprintf(
								/* translators: %s: selected day (YYYY-MM-DD). */
								__( 'No entries found for %s.', 'p2026' ),
								selectedDay
						  )
						: __( 'No audit log entries found.', 'p2026' ) }
				</Notice>
			) }

			{ isLoadingEntries && (
				<p>
					<Spinner /> { __( 'Loading audit entries…', 'p2026' ) }
				</p>
			) }

			{ ! isLoadingEntries && ! errorMessage && rawItems.length > 0 && (
				<DataViews
					data={ processedData }
					fields={ fields }
					view={ view }
					onChangeView={ setView }
					defaultLayouts={ { table: { layout: {} } } }
					paginationInfo={ paginationInfo }
				/>
			) }
		</div>
	);
};

document.addEventListener( 'DOMContentLoaded', () => {
	const mountNode = document.getElementById( 'p2026-audit-log-viewer-root' );
	if ( ! mountNode || ! window.p2026AuditLogConfig ) {
		return;
	}

	render(
		<AuditLogViewerApp config={ window.p2026AuditLogConfig } />,
		mountNode
	);
} );
