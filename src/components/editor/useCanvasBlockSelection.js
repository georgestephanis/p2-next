import { useCallback } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';

const MAX_FOCUS_ATTEMPTS = 6;
const EDITABLE_SELECTOR =
	'[contenteditable="true"], .block-editor-rich-text__editable, textarea, input[type="text"], [role="textbox"]';

function getEditableElement( blockEl ) {
	if ( ! blockEl ) {
		return null;
	}

	return blockEl.querySelector( EDITABLE_SELECTOR ) || null;
}

function getCanvasEditable( canvasEl ) {
	if ( ! canvasEl ) {
		return null;
	}

	return canvasEl.querySelector( EDITABLE_SELECTOR ) || null;
}

function pokeBlockForEditing( blockEl ) {
	if ( ! blockEl ) {
		return;
	}

	const target =
		blockEl.querySelector(
			'.wp-block, .block-editor-rich-text__editable'
		) || blockEl;

	if ( typeof target.focus === 'function' ) {
		target.focus();
	}

	[ 'mousedown', 'mouseup', 'click' ].forEach( ( type ) => {
		target.dispatchEvent(
			new window.MouseEvent( type, {
				bubbles: true,
				cancelable: true,
				view: target.ownerDocument?.defaultView || window,
			} )
		);
	} );
}

function focusEditableInBlock( blockEl, attempt = 0, canvasEl = null ) {
	const clientId = blockEl?.dataset?.block;
	const doc = blockEl?.ownerDocument;
	const currentBlockEl =
		( clientId &&
			doc?.querySelector?.( `[data-block="${ clientId }"]` ) ) ||
		blockEl;
	const blockEditable = getEditableElement( currentBlockEl );
	const canvasEditable = getCanvasEditable( canvasEl );
	const editable = blockEditable || canvasEditable;

	if ( ! currentBlockEl ) {
		return;
	}

	if ( ! editable || typeof editable.focus !== 'function' ) {
		if ( attempt === 1 ) {
			pokeBlockForEditing( currentBlockEl );
		}

		if ( attempt < MAX_FOCUS_ATTEMPTS ) {
			window.requestAnimationFrame( () =>
				focusEditableInBlock( currentBlockEl, attempt + 1, canvasEl )
			);
			return;
		}
		return;
	}

	editable.focus();

	if ( editable.matches( 'textarea, input' ) ) {
		const end = editable.value?.length || 0;
		if ( typeof editable.setSelectionRange === 'function' ) {
			editable.setSelectionRange( end, end );
		}
		return;
	}

	const selection = editable.ownerDocument?.getSelection?.();
	if (
		! selection ||
		typeof editable.ownerDocument?.createRange !== 'function'
	) {
		return;
	}

	const range = editable.ownerDocument.createRange();
	range.selectNodeContents( editable );
	range.collapse( false );
	selection.removeAllRanges();
	selection.addRange( range );
}

/**
 * Shared canvas selection behavior for frontend block editors.
 *
 * Clicking empty canvas space selects the nearest block vertically.
 * Pressing Enter/Space on the empty canvas selects the first block.
 *
 * @return {{ onCanvasClick: Function, onCanvasKeyDown: Function }} Canvas handlers.
 */
export default function useCanvasBlockSelection() {
	const { selectBlock } = useDispatch( 'core/block-editor' );

	const onCanvasKeyDown = useCallback(
		( event ) => {
			if ( event.target !== event.currentTarget ) {
				return;
			}
			if ( event.key !== 'Enter' && event.key !== ' ' ) {
				return;
			}
			const first = event.currentTarget.querySelector( '[data-block]' );
			if ( first ) {
				selectBlock( first.dataset.block, 0 );
				window.requestAnimationFrame( () =>
					focusEditableInBlock( first, 0, event.currentTarget )
				);
			}
		},
		[ selectBlock ]
	);

	const onCanvasClick = useCallback(
		( event ) => {
			// If the click is already inside an actual block, let Gutenberg's
			// native handling do its thing.
			if ( event.target.closest( '[data-block]' ) ) {
				return;
			}

			const blockEls = [
				...event.currentTarget.querySelectorAll( '[data-block]' ),
			];
			if ( ! blockEls.length ) {
				return;
			}

			const { clientY } = event;
			const nearest = blockEls.reduce( ( best, element ) => {
				const { top, height } = element.getBoundingClientRect();
				const dist = Math.abs( clientY - ( top + height / 2 ) );
				const { top: bestTop, height: bestHeight } =
					best.getBoundingClientRect();
				const bestDist = Math.abs(
					clientY - ( bestTop + bestHeight / 2 )
				);

				return dist < bestDist ? element : best;
			} );

			selectBlock( nearest.dataset.block, 0 );
			window.requestAnimationFrame( () =>
				focusEditableInBlock( nearest, 0, event.currentTarget )
			);
		},
		[ selectBlock ]
	);

	return {
		onCanvasClick,
		onCanvasKeyDown,
	};
}
