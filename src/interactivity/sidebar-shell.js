/**
 * Interactivity: Sidebar Shell behavior.
 *
 * Handles open/collapse state, focus management, Escape handling, and
 * localStorage persistence when collapse is allowed.
 */
import { interactivityStore, interactivityWithSyncEvent } from './runtime';

const STORAGE_KEY = 'p2026.sidebarShell.collapsed';
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function clearPersistedCollapsedState() {
	try {
		localStorage.removeItem( STORAGE_KEY );
	} catch {
		// Ignore storage failures.
	}
}

function isManagedRoot( root ) {
	return !! root?.matches?.( '[data-p2026-sidebar-shell]' );
}

function getRootData( root ) {
	const allowCollapse = root?.dataset?.allowCollapse !== '0';
	const defaultOpen = root?.dataset?.defaultOpen !== '0';
	const toggleButton = root?.querySelector?.(
		'.p2026-sidebar-shell__toggle'
	);
	const panel = root?.querySelector?.( '#p2026-sidebar-shell-panel' );

	return {
		allowCollapse,
		defaultOpen,
		canToggle: allowCollapse && !! toggleButton,
		toggleButton,
		panel,
	};
}

function setExpanded( root, expanded ) {
	if ( ! isManagedRoot( root ) ) {
		return;
	}

	const { canToggle, toggleButton } = getRootData( root );
	const isCollapsed = ! expanded;

	root.classList.toggle( 'is-collapsed', isCollapsed );
	document.body.classList.toggle( 'p2026-sidebar-shell-visible', expanded );
	document.documentElement.classList.toggle(
		'p2026-sidebar-shell-visible',
		expanded
	);

	if ( canToggle && toggleButton ) {
		toggleButton.setAttribute(
			'aria-expanded',
			expanded ? 'true' : 'false'
		);
	}

	if ( canToggle ) {
		try {
			localStorage.setItem( STORAGE_KEY, String( isCollapsed ) );
		} catch {
			// Ignore storage failures.
		}
	} else {
		clearPersistedCollapsedState();
	}
}

function focusFirstInsidePanel( root ) {
	const { panel } = getRootData( root );
	if ( ! panel ) {
		return;
	}

	const firstFocusable = panel.querySelector( FOCUSABLE_SELECTOR );
	if ( firstFocusable && typeof firstFocusable.focus === 'function' ) {
		firstFocusable.focus();
		return;
	}

	if ( ! panel.hasAttribute( 'tabindex' ) ) {
		panel.setAttribute( 'tabindex', '-1' );
	}

	panel.focus();
}

interactivityStore( 'p2026/sidebar-shell', {
	actions: {
		init: () => {
			const root = document.querySelector( '[data-p2026-sidebar-shell]' );
			if ( ! isManagedRoot( root ) ) {
				return;
			}

			const { canToggle, defaultOpen } = getRootData( root );
			let expanded = defaultOpen;

			if ( ! canToggle ) {
				expanded = true;
				clearPersistedCollapsedState();
			} else {
				try {
					const persisted = localStorage.getItem( STORAGE_KEY );
					if ( persisted === 'false' ) {
						expanded = true;
					} else if ( persisted === 'true' ) {
						expanded = false;
					}
				} catch {
					expanded = defaultOpen;
				}
			}

			setExpanded( root, expanded );
			window.requestAnimationFrame( () => {
				root.classList.remove( 'is-initializing' );
			} );
		},

		toggle: interactivityWithSyncEvent( ( event ) => {
			const root = event.currentTarget?.closest?.(
				'[data-p2026-sidebar-shell]'
			);
			if ( ! isManagedRoot( root ) ) {
				return;
			}

			const isCollapsed = root.classList.contains( 'is-collapsed' );
			const nextExpanded = isCollapsed;
			setExpanded( root, nextExpanded );

			if ( nextExpanded ) {
				window.requestAnimationFrame( () =>
					focusFirstInsidePanel( root )
				);
			}
		} ),

		handleDocumentKeydown: interactivityWithSyncEvent( ( event ) => {
			if ( event.key !== 'Escape' ) {
				return;
			}

			const root = document.querySelector( '[data-p2026-sidebar-shell]' );
			if ( ! isManagedRoot( root ) ) {
				return;
			}

			const { canToggle, toggleButton } = getRootData( root );
			if ( ! canToggle || root.classList.contains( 'is-collapsed' ) ) {
				return;
			}

			setExpanded( root, false );
			if ( toggleButton ) {
				toggleButton.focus();
			}
		} ),
	},
} );
