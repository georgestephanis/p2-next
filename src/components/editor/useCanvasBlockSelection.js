import { useCallback } from '@wordpress/element';
import { useDispatch } from '@wordpress/data';

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
				selectBlock( first.dataset.block );
			}
		},
		[ selectBlock ]
	);

	const onCanvasClick = useCallback(
		( event ) => {
			if ( event.target !== event.currentTarget ) {
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

			selectBlock( nearest.dataset.block );
		},
		[ selectBlock ]
	);

	return {
		onCanvasClick,
		onCanvasKeyDown,
	};
}
