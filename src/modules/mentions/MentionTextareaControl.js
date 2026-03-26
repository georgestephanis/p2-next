/**
 * MentionTextareaControl — a textarea that autocompletes @username mentions.
 *
 * Visually identical to `TextareaControl` from @wordpress/components (same
 * CSS class on the inner <textarea>). When the user types `@` followed by
 * one or more characters a suggestion list appears below the textarea. Selecting
 * a suggestion replaces the current `@partial` token with `@username `.
 *
 * Only logged-in users see suggestions; the REST endpoint requires authentication
 * so for guests the component behaves exactly like a plain TextareaControl.
 *
 * Keyboard navigation:
 *   ArrowDown / ArrowUp — move active index
 *   Enter / Tab         — accept active suggestion
 *   Escape              — dismiss suggestions
 */
import { useState, useEffect, useRef, useCallback } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import { __ } from '@wordpress/i18n';

/** Minimum characters after `@` before fetching. */
const MIN_QUERY_LENGTH = 1;
/** Debounce delay in ms before issuing the REST request. */
const DEBOUNCE_MS = 300;
/** Pattern: `@word` at end of the text up to the cursor, not preceded by word char or `.@`. */
const MENTION_RE = /(?:^|[\s\S])@([a-zA-Z0-9_-]*)$/;

/**
 * Return the `@partial` token immediately before the caret, or null.
 *
 * @param {string} value          Full textarea value.
 * @param {number} selectionStart Cursor position.
 * @return {{ query: string, start: number }|null} Mention token info, or null if no active mention.
 */
function getMentionAtCursor( value, selectionStart ) {
	const before = value.slice( 0, selectionStart );
	const match = before.match( MENTION_RE );
	if ( ! match ) {
		return null;
	}
	// Confirm the `@` is not preceded by a word character (avoids email@domain).
	const atIndex = before.lastIndexOf( '@' );
	if ( atIndex > 0 ) {
		const prev = before[ atIndex - 1 ];
		if ( /[a-zA-Z0-9.]/.test( prev ) ) {
			return null;
		}
	}
	return { query: match[ 1 ], start: atIndex };
}

export default function MentionTextareaControl( {
	value,
	onChange,
	placeholder,
	label,
	rows = 4,
	disabled = false,
} ) {
	const textareaRef = useRef( null );
	const listRef = useRef( null );
	const debounceRef = useRef( null );

	const [ suggestions, setSuggestions ] = useState( [] );
	const [ activeIndex, setActiveIndex ] = useState( 0 );
	const [ mentionMeta, setMentionMeta ] = useState( null ); // { query, start }

	const isLoggedIn = !! window.p2026Config?.currentUser;

	// Fetch suggestions whenever the query changes.
	useEffect( () => {
		if (
			! isLoggedIn ||
			! mentionMeta ||
			mentionMeta.query.length < MIN_QUERY_LENGTH
		) {
			setSuggestions( [] );
			return;
		}

		const { query } = mentionMeta;

		if ( debounceRef.current ) {
			clearTimeout( debounceRef.current );
		}
		debounceRef.current = setTimeout( async () => {
			try {
				const users = await apiFetch( {
					path: `/p2026/v1/users?search=${ encodeURIComponent(
						query
					) }&per_page=5`,
				} );
				setSuggestions( users );
				setActiveIndex( 0 );
			} catch {
				setSuggestions( [] );
			}
		}, DEBOUNCE_MS );

		return () => {
			if ( debounceRef.current ) {
				clearTimeout( debounceRef.current );
			}
		};
	}, [ isLoggedIn, mentionMeta ] );

	// Accept a suggestion: replace the @partial in the textarea value.
	const acceptSuggestion = useCallback(
		( user ) => {
			if ( ! mentionMeta ) {
				return;
			}
			const { start } = mentionMeta;
			const selectionStart =
				textareaRef.current?.selectionStart ?? value.length;
			const before = value.slice( 0, start );
			const after = value.slice( selectionStart );
			const inserted = `@${ user.slug } `;
			const newValue = before + inserted + after;

			onChange( newValue );
			setSuggestions( [] );
			setMentionMeta( null );

			// Restore focus and move caret to end of inserted text.
			const textarea = textareaRef.current;
			if ( textarea ) {
				textarea.focus();
				const pos = ( before + inserted ).length;
				window.requestAnimationFrame( () => {
					textarea.setSelectionRange( pos, pos );
				} );
			}
		},
		[ value, onChange, mentionMeta ]
	);

	// Dismiss suggestions.
	const dismiss = useCallback( () => {
		setSuggestions( [] );
		setMentionMeta( null );
	}, [] );

	// Textarea input handler — detect @mention at cursor.
	const onInput = useCallback( ( e ) => {
		const textarea = e.target;
		const meta = getMentionAtCursor(
			textarea.value,
			textarea.selectionStart
		);
		setMentionMeta( meta );
		if ( ! meta ) {
			setSuggestions( [] );
		}
	}, [] );

	// Keyboard handler for navigation within the suggestion list.
	const onKeyDown = useCallback(
		( e ) => {
			if ( ! suggestions.length ) {
				return;
			}
			if ( e.key === 'ArrowDown' ) {
				e.preventDefault();
				setActiveIndex( ( i ) =>
					Math.min( i + 1, suggestions.length - 1 )
				);
			} else if ( e.key === 'ArrowUp' ) {
				e.preventDefault();
				setActiveIndex( ( i ) => Math.max( i - 1, 0 ) );
			} else if ( e.key === 'Enter' || e.key === 'Tab' ) {
				if ( suggestions[ activeIndex ] ) {
					e.preventDefault();
					acceptSuggestion( suggestions[ activeIndex ] );
				}
			} else if ( e.key === 'Escape' ) {
				dismiss();
			}
		},
		[ suggestions, activeIndex, acceptSuggestion, dismiss ]
	);

	const showSuggestions = isLoggedIn && suggestions.length > 0;

	return (
		<div className="components-base-control p2026-mention-textarea-wrap">
			{ label && (
				// eslint-disable-next-line jsx-a11y/label-has-associated-control
				<label className="components-base-control__label">
					{ label }
				</label>
			) }
			{ /* eslint-disable-next-line jsx-a11y/role-supports-aria-props -- combobox pattern on textarea */ }
			<textarea
				ref={ textareaRef }
				className="components-textarea-control__input"
				value={ value }
				placeholder={ placeholder }
				rows={ rows }
				disabled={ disabled }
				onChange={ ( e ) => onChange( e.target.value ) }
				onInput={ onInput }
				onKeyDown={ onKeyDown }
				aria-autocomplete={ isLoggedIn ? 'list' : undefined }
				aria-expanded={ showSuggestions }
				aria-controls={
					showSuggestions ? 'p2026-mention-suggestions' : undefined
				}
				aria-activedescendant={
					showSuggestions
						? `p2026-mention-option-${ activeIndex }`
						: undefined
				}
			/>
			{ showSuggestions && (
				<ul
					ref={ listRef }
					id="p2026-mention-suggestions"
					role="listbox"
					className="p2026-mention-suggestions"
					aria-label={ __( 'Mention suggestions', 'p2026' ) }
				>
					{ /* Keyboard navigation is handled by the textarea's onKeyDown (ArrowDown/Up/Enter/Tab/Escape). */ }
					{ /* eslint-disable jsx-a11y/click-events-have-key-events */ }
					{ suggestions.map( ( user, index ) => (
						<li
							key={ user.id }
							id={ `p2026-mention-option-${ index }` }
							role="option"
							aria-selected={ index === activeIndex }
							className={
								'p2026-mention-suggestions__item' +
								( index === activeIndex ? ' is-active' : '' )
							}
							// Prevent mousedown from stealing focus away from the textarea.
							onMouseDown={ ( e ) => e.preventDefault() }
							onClick={ () => acceptSuggestion( user ) }
						>
							{ user.avatar_url && (
								<img
									src={ user.avatar_url }
									alt=""
									width={ 20 }
									height={ 20 }
									aria-hidden="true"
								/>
							) }
							<span className="p2026-mention-suggestions__name">
								{ user.name }
							</span>
							<span className="p2026-mention-suggestions__slug">
								@{ user.slug }
							</span>
						</li>
					) ) }
					{ /* eslint-enable jsx-a11y/click-events-have-key-events */ }
				</ul>
			) }
		</div>
	);
}
