import {
	createRoot,
	render,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	Button,
	Notice,
	SearchControl,
	SelectControl,
	Spinner,
} from '@wordpress/components';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';

import './audit-log-viewer.scss';

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

const renderActorCell = ( item, relatedData ) => {
	const actorId = Number( item.actor_id || 0 );
	if ( ! actorId ) {
		return '—';
	}

	const actor = relatedData.users[ actorId ] || null;
	/* translators: %d: user ID. */
	const actorFallbackName = sprintf( __( 'User #%d', 'p2026' ), actorId );
	/* translators: %d: user ID. */
	const actorName = actor?.name ? actor.name : actorFallbackName;

	return (
		<div className="p2026-audit-log-viewer__entity p2026-audit-log-viewer__entity--actor">
			{ actor?.avatar_url ? (
				<img
					className="p2026-audit-log-viewer__avatar"
					src={ actor.avatar_url }
					alt=""
				/>
			) : null }
			<div>
				<div className="p2026-audit-log-viewer__entity-title">
					{ actorName }
				</div>
				<div className="p2026-audit-log-viewer__entity-meta">
					{
						/* translators: %d: user ID. */
						sprintf( __( 'ID %d', 'p2026' ), actorId )
					}
				</div>
			</div>
		</div>
	);
};

const renderPostCell = ( item, relatedData ) => {
	const postId = Number( item.post_id || 0 );
	if ( ! postId ) {
		return '—';
	}

	const post = relatedData.posts[ postId ] || null;
	/* translators: %d: post ID. */
	const postFallbackTitle = sprintf( __( 'Post #%d', 'p2026' ), postId );
	/* translators: %d: post ID. */
	const postLabel = post?.title ? post.title : postFallbackTitle;

	return (
		<div className="p2026-audit-log-viewer__entity">
			<div className="p2026-audit-log-viewer__entity-title">
				{ post?.permalink ? (
					<a
						href={ post.permalink }
						target="_blank"
						rel="noreferrer noopener"
					>
						{ postLabel }
					</a>
				) : (
					postLabel
				) }
			</div>
			<div className="p2026-audit-log-viewer__entity-meta">
				{
					/* translators: %d: post ID. */
					sprintf( __( 'ID %d', 'p2026' ), postId )
				}
			</div>
		</div>
	);
};

const renderCommentCell = ( item, relatedData ) => {
	const commentId = Number( item.comment_id || 0 );
	if ( ! commentId ) {
		return '—';
	}

	const comment = relatedData.comments[ commentId ] || null;
	/* translators: %d: comment ID. */
	const commentLabel = sprintf( __( 'Comment #%d', 'p2026' ), commentId );

	return (
		<div className="p2026-audit-log-viewer__entity">
			<div className="p2026-audit-log-viewer__entity-title">
				{ comment?.permalink ? (
					<a
						href={ comment.permalink }
						target="_blank"
						rel="noreferrer noopener"
					>
						{ commentLabel }
					</a>
				) : (
					commentLabel
				) }
			</div>
			{ comment?.excerpt ? (
				<div className="p2026-audit-log-viewer__entity-meta">
					{ comment.excerpt }
				</div>
			) : null }
		</div>
	);
};

const collectUniqueIds = ( items, key ) => {
	const ids = new Set();
	items.forEach( ( item ) => {
		const value = Number( item?.[ key ] || 0 );
		if ( value > 0 ) {
			ids.add( value );
		}
	} );
	return Array.from( ids );
};

const AuditLogViewerApp = ( { config } ) => {
	const [ days, setDays ] = useState( [] );
	const [ selectedDay, setSelectedDay ] = useState( '' );
	const [ isLoadingDays, setIsLoadingDays ] = useState( true );
	const [ isLoadingEntries, setIsLoadingEntries ] = useState( true );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ rawItems, setRawItems ] = useState( [] );
	const [ relatedData, setRelatedData ] = useState( {
		users: {},
		posts: {},
		comments: {},
	} );
	const [ view, setView ] = useState( {
		type: 'table',
		perPage: 25,
		fields: [
			'timestamp',
			'event_type',
			'post_id',
			'comment_id',
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
				label: __( 'Post', 'p2026' ),
				enableGlobalSearch: true,
				render: ( { item } ) => renderPostCell( item, relatedData ),
			},
			{
				id: 'comment_id',
				label: __( 'Comment', 'p2026' ),
				enableGlobalSearch: true,
				render: ( { item } ) => renderCommentCell( item, relatedData ),
			},
			{
				id: 'actor_id',
				label: __( 'Actor', 'p2026' ),
				enableGlobalSearch: true,
				render: ( { item } ) => renderActorCell( item, relatedData ),
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
		[ relatedData ]
	);

	const loadRelatedData = useCallback(
		async ( items ) => {
			const userIds = collectUniqueIds( items, 'actor_id' );
			const postIds = collectUniqueIds( items, 'post_id' );
			const commentIds = collectUniqueIds( items, 'comment_id' );

			if ( userIds.length + postIds.length + commentIds.length === 0 ) {
				setRelatedData( { users: {}, posts: {}, comments: {} } );
				return;
			}

			try {
				const response = await window.fetch(
					buildUrl( `${ config.restRoot }p2026/v1/lookups`, {
						user_ids: userIds.join( ',' ),
						post_ids: postIds.join( ',' ),
						comment_ids: commentIds.join( ',' ),
					} ),
					{
						headers: {
							'X-WP-Nonce': config.restNonce,
						},
					}
				);

				if ( ! response.ok ) {
					throw new Error( 'related-fetch-failed' );
				}

				const payload = await response.json();
				setRelatedData( {
					users: payload.users || {},
					posts: payload.posts || {},
					comments: payload.comments || {},
				} );
			} catch ( error ) {
				setRelatedData( { users: {}, posts: {}, comments: {} } );
			}
		},
		[ config.restNonce, config.restRoot ]
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
			const items = Array.isArray( payload.items ) ? payload.items : [];
			setRawItems( items );
			await loadRelatedData( items );
		} catch ( error ) {
			setErrorMessage(
				__( 'Unable to load audit log entries.', 'p2026' )
			);
			setRawItems( [] );
			setRelatedData( { users: {}, posts: {}, comments: {} } );
		}

		setIsLoadingEntries( false );
	}, [ config.restBase, config.restNonce, loadRelatedData, selectedDay ] );

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
		<div className="p2026-audit-log-viewer">
			<div className="p2026-audit-log-viewer__toolbar">
				<div className="p2026-audit-log-viewer__day-select">
					<SelectControl
						label={ __( 'Log Day', 'p2026' ) }
						value={ selectedDay }
						options={ dayOptions }
						onChange={ ( value ) => setSelectedDay( value ) }
						disabled={ isLoadingDays }
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</div>
				<div className="p2026-audit-log-viewer__search">
					<SearchControl
						label={ __( 'Search entries', 'p2026' ) }
						value={ view.search || '' }
						onChange={ ( value ) => {
							setView( ( currentView ) => ( {
								...currentView,
								search: value,
								page: 1,
							} ) );
						} }
						__nextHasNoMarginBottom
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
					search={ false }
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

	if ( 'function' === typeof createRoot ) {
		createRoot( mountNode ).render(
			<AuditLogViewerApp config={ window.p2026AuditLogConfig } />
		);
		return;
	}

	render(
		<AuditLogViewerApp config={ window.p2026AuditLogConfig } />,
		mountNode
	);
} );
