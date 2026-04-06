/**
 * NewPostModal — modal wrapper for the new-post editor.
 *
 * Opened by the admin bar "New Post" button when no p2026/new-post block is
 * already present on the page. Reads open/close state from the shared store
 * so the admin bar click handler (in frontend.js) can drive it without needing
 * a direct reference to the component.
 *
 * Accessibility notes:
 *   - role="dialog" + aria-modal="true" on the panel.
 *   - Focus moves to the editor canvas on open; returns to the trigger on close.
 *   - Escape key and overlay click both close the modal.
 *   - document.body scroll is locked while open.
 */
import { useEffect, useRef, useCallback } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import { STORE_NAME } from '../store';
import NewPostEditor from './NewPostEditor';
import '../interactivity/new-post-modal';

export default function NewPostModal() {
	const isOpen = useSelect( ( select ) =>
		select( STORE_NAME ).isNewPostModalOpen()
	);
	const { closeNewPostModal } = useDispatch( STORE_NAME );

	const dialogRef = useRef( null );
	// Keep a ref to whatever had focus before the modal opened so we can
	// restore it on close.
	const previousFocusRef = useRef( null );

	// Focus management and scroll lock.
	useEffect( () => {
		if ( ! isOpen ) {
			return;
		}

		// Capture via ownerDocument on the dialog ref to satisfy
		// @wordpress/no-global-active-element.
		previousFocusRef.current =
			dialogRef.current?.ownerDocument.activeElement ?? null;

		// Lock body scroll.
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		// Move focus into the editor canvas on the next frame so the dialog
		// has finished rendering before we try to focus inside it.
		const raf = window.requestAnimationFrame( () => {
			const canvas = dialogRef.current?.querySelector(
				'.p2026-editor-canvas'
			);
			( canvas ?? dialogRef.current )?.focus();
		} );

		return () => {
			window.cancelAnimationFrame( raf );
			document.body.style.overflow = prevOverflow;
			previousFocusRef.current?.focus();
		};
	}, [ isOpen ] );

	// Close when clicking the backdrop (not the dialog panel itself).
	const onOverlayClick = useCallback(
		( e ) => {
			if ( e.target === e.currentTarget ) {
				closeNewPostModal();
			}
		},
		[ closeNewPostModal ]
	);

	if ( ! isOpen ) {
		return null;
	}

	return (
		// The backdrop's keyboard equivalent is Escape, handled at the
		// document level above. Suppressing the a11y overlay warnings is
		// the same approach used by @wordpress/components Modal.
		// eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
		<div
			className="p2026-modal-overlay"
			onClick={ onOverlayClick }
			data-wp-interactive="p2026/new-post-modal"
			data-wp-on-document--keydown="actions.handleDocumentKeydown"
		>
			<div
				ref={ dialogRef }
				className="p2026-modal"
				role="dialog"
				aria-modal="true"
				aria-label={ __( 'New Post', 'p2026' ) }
				// eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
				tabIndex={ -1 }
			>
				<div className="p2026-modal-header">
					<span className="p2026-modal-title">
						{ __( 'New Post', 'p2026' ) }
					</span>
					<button
						type="button"
						className="p2026-modal-close"
						aria-label={ __( 'Close', 'p2026' ) }
						onClick={ closeNewPostModal }
					>
						{ /* × */ }
						<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div className="p2026-modal-body">
					<NewPostEditor onAfterPublish={ closeNewPostModal } />
				</div>
			</div>
		</div>
	);
}
