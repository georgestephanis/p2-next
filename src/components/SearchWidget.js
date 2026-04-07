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
	const requestIdRef = useRef( 0 );
	const modalSearchRef = useRef( null );

	// Debounced search.
	const handleSearch = useCallback( ( value ) => {
		setQuery( value );
		requestIdRef.current += 1;
		const requestId = requestIdRef.current;

		if ( timeoutRef.current ) {
			clearTimeout( timeoutRef.current );
		}

		if ( ! value || value.length < 2 ) {
			setResults( [] );
			setIsLoading( false );
			setIsOpen( ( prev ) => prev );
			return;
		}

		// Mark that we're updating, but keep showing old results.
		setIsLoading( true );

		timeoutRef.current = setTimeout( async () => {
			try {
				const data = await apiFetch( {
					path: `/p2026/v1/search?q=${ encodeURIComponent(
						value
					) }&limit=20`,
				} );

				if ( requestId !== requestIdRef.current ) {
					return;
				}

				const nextResults = Array.isArray( data ) ? data : [];
				setResults( nextResults );
				// Open only on first successful non-empty result set. Once
				// opened, keep it open while the user refines the query.
				setIsOpen( ( prev ) => prev || nextResults.length > 0 );
			} catch ( error ) {
				if ( requestId !== requestIdRef.current ) {
					return;
				}

				// eslint-disable-next-line no-console
				console.error( 'Search failed:', error );
				setResults( [] );
				setIsOpen( ( prev ) => prev );
			} finally {
				if ( requestId === requestIdRef.current ) {
					setIsLoading( false );
				}
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

	const noResultsState =
		! isLoading && results.length === 0 && query.length >= 2;
	const modalTitle = noResultsState
		? __( 'Search Results - No results', 'p2026' )
		: __( 'Search Results', 'p2026' );

	useEffect( () => {
		if ( ! isOpen ) {
			return;
		}

		const rafId = window.requestAnimationFrame( () => {
			const inputEl = modalSearchRef.current?.querySelector( 'input' );
			if ( inputEl ) {
				inputEl.focus();
				const end = inputEl.value?.length ?? 0;
				inputEl.setSelectionRange( end, end );
			}
		} );

		return () => window.cancelAnimationFrame( rafId );
	}, [ isOpen ] );

	return (
		<div className="p2026-search-widget">
			<SearchControl
				value={ query }
				onChange={ handleSearch }
				placeholder={ __( 'Search posts and comments…', 'p2026' ) }
				className="p2026-search-input"
				__nextHasNoMarginBottom
			/>

			{ isOpen && (
				<Modal
					title={ modalTitle }
					onRequestClose={ () => setIsOpen( false ) }
					className="p2026-search-modal"
					isFullScreen={ false }
				>
					<div className="p2026-search-modal-content">
						<div
							className="p2026-search-modal-input"
							ref={ modalSearchRef }
						>
							<SearchControl
								value={ query }
								onChange={ handleSearch }
								placeholder={ __(
									'Search posts and comments…',
									'p2026'
								) }
								__nextHasNoMarginBottom
							/>
						</div>

						{ results.length > 0 && (
							<div className="p2026-search-results-wrapper">
								{ isLoading && (
									<div className="p2026-search-results-overlay">
										<Spinner />
										<p>{ __( 'Searching…', 'p2026' ) }</p>
									</div>
								) }
								<ul className="p2026-search-results">
									{ results.map( ( result ) => (
										<li
											key={ `${ result.type }-${ result.id }` }
											className={ `p2026-search-result-entering` }
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
														: __(
																'Comment',
																'p2026'
														  ) }
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
							</div>
						) }

						{ noResultsState && (
							<p className="p2026-search-empty">
								{ __( 'No results found.', 'p2026' ) }
							</p>
						) }
					</div>
				</Modal>
			) }
		</div>
	);
}
