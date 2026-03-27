/**
 * SearchWidget — search component for p2026.
 *
 * Provides a searchable input that queries posts and comments via REST API.
 * Results are displayed in a modal overlay.
 */
import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import { SearchControl, Modal, Spinner } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import './search.scss';

export default function SearchWidget() {
	const [ query, setQuery ] = useState( '' );
	const [ results, setResults ] = useState( [] );
	const [ isLoading, setIsLoading ] = useState( false );
	const [ isOpen, setIsOpen ] = useState( false );
	const timeoutRef = useRef( null );

	// Debounced search.
	const handleSearch = useCallback( ( value ) => {
		setQuery( value );

		if ( timeoutRef.current ) {
			clearTimeout( timeoutRef.current );
		}

		if ( ! value || value.length < 2 ) {
			setResults( [] );
			setIsLoading( false );
			return;
		}

		setIsLoading( true );

		timeoutRef.current = setTimeout( async () => {
			try {
				const data = await apiFetch( {
					path: `/p2026/v1/search?q=${ encodeURIComponent(
						value
					) }&limit=20`,
				} );
				setResults( data || [] );
			} catch ( error ) {
				// eslint-disable-next-line no-console
				console.error( 'Search failed:', error );
				setResults( [] );
			} finally {
				setIsLoading( false );
			}
		}, 300 );
	}, [] );

	// Handle result click — navigate to post or comment.
	const handleResultClick = useCallback( ( result ) => {
		if ( 'post' === result.type ) {
			window.location.href = `${ window.location.origin }/?p=${ result.id }`;
		} else if ( 'comment' === result.type ) {
			window.location.href = `${ window.location.origin }/?p=${ result.parentPostId }#comment-${ result.id }`;
		}
		setIsOpen( false );
	}, [] );

	// Cleanup on unmount.
	useEffect( () => {
		return () => {
			if ( timeoutRef.current ) {
				clearTimeout( timeoutRef.current );
			}
		};
	}, [] );

	const emptyState = ! isLoading && results.length === 0 && query.length >= 2;

	return (
		<div className="p2026-search-widget">
			<SearchControl
				value={ query }
				onChange={ handleSearch }
				onFocus={ () => setIsOpen( true ) }
				placeholder={ __( 'Search posts and comments…', 'p2026' ) }
				className="p2026-search-input"
			/>

			{ isOpen && (
				<Modal
					title={ query ? __( 'Search Results', 'p2026' ) : '' }
					onRequestClose={ () => setIsOpen( false ) }
					className="p2026-search-modal"
					isFullScreen={ false }
				>
					<div className="p2026-search-modal-content">
						{ isLoading && (
							<div className="p2026-search-loading">
								<Spinner />
								<p>{ __( 'Searching…', 'p2026' ) }</p>
							</div>
						) }

						{ emptyState && (
							<p className="p2026-search-empty">
								{ __( 'No results found.', 'p2026' ) }
							</p>
						) }

						{ ! isLoading && results.length > 0 && (
							<ul className="p2026-search-results">
								{ results.map( ( result ) => (
									<li
										key={ `${ result.type }-${ result.id }` }
									>
										<button
											onClick={ () =>
												handleResultClick( result )
											}
											className="p2026-search-result-item"
										>
											<div className="p2026-search-result-type-tag">
												{ 'post' === result.type
													? __( 'Post', 'p2026' )
													: __( 'Comment', 'p2026' ) }
											</div>
											<div className="p2026-search-result-body">
												<h3 className="p2026-search-result-title">
													{ result.title }
												</h3>
												<p className="p2026-search-result-excerpt">
													{ result.excerpt }
												</p>
												<small className="p2026-search-result-meta">
													{ result.author } •{ ' ' }
													{ new Date(
														result.date
													).toLocaleDateString() }
												</small>
											</div>
										</button>
									</li>
								) ) }
							</ul>
						) }
					</div>
				</Modal>
			) }
		</div>
	);
}
