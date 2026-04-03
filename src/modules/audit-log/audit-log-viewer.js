import {
	createRoot,
	render,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { store as coreDataStore, useEntityRecords } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import {
	Button,
	Notice,
	SearchControl,
	SelectControl,
	Spinner,
} from '@wordpress/components';
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews';

import './audit-log-viewer.scss';

const AUDIT_LOG_ENTITY = 'p2026AuditLogEntry';

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

const stripHtml = ( html ) => String( html || '' ).replace( /<[^>]+>/g, '' );

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
	return Array.from( ids ).sort( ( a, b ) => a - b );
};

const AuditLogViewerApp = ( { config } ) => {
	const { addEntities } = useDispatch( coreDataStore );
	const preloadedDay = config?.preloadedDay || '';
	const preloadedEntries = useMemo(
		() =>
			Array.isArray( config?.preloadedEntries )
				? config.preloadedEntries
				: [],
		[ config?.preloadedEntries ]
	);

	const [ days, setDays ] = useState( [] );
	const [ selectedDay, setSelectedDay ] = useState( preloadedDay );
	const [ isLoadingDays, setIsLoadingDays ] = useState( true );
	const [ errorMessage, setErrorMessage ] = useState( '' );
	const [ refreshToken, setRefreshToken ] = useState( 0 );
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

	useEffect( () => {
		addEntities( [
			{
				kind: 'root',
				name: AUDIT_LOG_ENTITY,
				baseURL: '/p2026/v1/audit-log/entries',
				key: 'id',
			},
		] );
	}, [ addEntities ] );

	const auditLogQuery = useMemo(
		() => ( {
			day: selectedDay || undefined,
			per_page: 500,
			page: 1,
			p2026_refresh: refreshToken,
		} ),
		[ refreshToken, selectedDay ]
	);

	const { records: rawItems, isResolving: isResolvingEntries } =
		useEntityRecords( 'root', AUDIT_LOG_ENTITY, auditLogQuery );

	const shouldUsePreloadedEntries =
		isResolvingEntries &&
		refreshToken === 0 &&
		selectedDay === preloadedDay;

	const safeItems = useMemo( () => {
		if ( Array.isArray( rawItems ) ) {
			return rawItems;
		}

		if ( shouldUsePreloadedEntries ) {
			return preloadedEntries;
		}

		return [];
	}, [ rawItems, shouldUsePreloadedEntries, preloadedEntries ] );
	const userIds = useMemo(
		() => collectUniqueIds( safeItems, 'actor_id' ),
		[ safeItems ]
	);
	const postIds = useMemo(
		() => collectUniqueIds( safeItems, 'post_id' ),
		[ safeItems ]
	);
	const commentIds = useMemo(
		() => collectUniqueIds( safeItems, 'comment_id' ),
		[ safeItems ]
	);

	const { records: userRecords, isResolving: isResolvingUsers } =
		useEntityRecords(
			'root',
			'user',
			{ include: userIds, per_page: Math.max( userIds.length, 1 ) },
			{ enabled: userIds.length > 0 }
		);

	const { records: postRecords, isResolving: isResolvingPosts } =
		useEntityRecords(
			'postType',
			'post',
			{ include: postIds, per_page: Math.max( postIds.length, 1 ) },
			{ enabled: postIds.length > 0 }
		);

	const { records: commentRecords, isResolving: isResolvingComments } =
		useEntityRecords(
			'root',
			'comment',
			{
				include: commentIds,
				per_page: Math.max( commentIds.length, 1 ),
				status: 'all',
			},
			{ enabled: commentIds.length > 0 }
		);

	const relatedData = useMemo( () => {
		const users = {};
		( userRecords || [] ).forEach( ( user ) => {
			users[ Number( user.id ) ] = {
				name: user?.name || '',
				avatar_url:
					user?.avatar_urls?.[ '24' ] ||
					user?.avatar_urls?.[ '32' ] ||
					'',
			};
		} );

		const posts = {};
		( postRecords || [] ).forEach( ( post ) => {
			posts[ Number( post.id ) ] = {
				title: stripHtml( post?.title?.rendered || '' ),
				permalink: post?.link || '',
			};
		} );

		const comments = {};
		( commentRecords || [] ).forEach( ( comment ) => {
			comments[ Number( comment.id ) ] = {
				excerpt: stripHtml( comment?.content?.rendered || '' ),
				permalink: comment?.link || '',
			};
		} );

		return { users, posts, comments };
	}, [ commentRecords, postRecords, userRecords ] );

	const isLoadingEntries =
		isResolvingEntries ||
		isResolvingUsers ||
		isResolvingPosts ||
		isResolvingComments;

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

	useEffect( () => {
		void loadDays();
	}, [ loadDays ] );

	const dayOptions = useMemo( () => {
		const options = [ { label: __( 'All Days', 'p2026' ), value: '' } ];
		days.forEach( ( day ) => {
			options.push( { label: day, value: day } );
		} );
		return options;
	}, [ days ] );

	const { data: processedData, paginationInfo } = useMemo(
		() => filterSortAndPaginate( safeItems, view, fields ),
		[ fields, safeItems, view ]
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
					onClick={ () => setRefreshToken( ( token ) => token + 1 ) }
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

			{ ! isLoadingEntries &&
				! errorMessage &&
				safeItems.length === 0 && (
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

			{ ! isLoadingEntries && ! errorMessage && safeItems.length > 0 && (
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
