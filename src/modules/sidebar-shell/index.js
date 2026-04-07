import onDomReady from '../../utils/on-dom-ready';
import './_sidebar-shell.scss';

const STORAGE_KEY = 'p2026.sidebarShell.collapsed';
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function mountSidebarShell() {
	const root = document.querySelector( '[data-p2026-sidebar-shell]' );
	if ( ! root ) {
		return;
	}

	// If Interactivity API directives are present, that implementation owns
	// behavior. This script remains as a fallback for older environments.
	if ( root.hasAttribute( 'data-wp-interactive' ) ) {
		return;
	}

	const panel = root.querySelector( '#p2026-sidebar-shell-panel' );
	const toggleButton = root.querySelector( '.p2026-sidebar-shell__toggle' );
	const allowCollapse = root.dataset.allowCollapse !== '0';
	const defaultOpen = root.dataset.defaultOpen !== '0';
	const canToggle = allowCollapse && !! toggleButton;

	// Resolve the initial collapsed state before defining the closures that
	// mutate it, so the `let` declaration is always visible before its uses.
	let collapsed;
	if ( ! canToggle ) {
		collapsed = false;
	} else {
		collapsed = ! defaultOpen;
		try {
			const persisted = localStorage.getItem( STORAGE_KEY );
			if ( persisted === 'false' ) {
				collapsed = false;
			} else if ( persisted === 'true' ) {
				collapsed = true;
			}
		} catch {
			collapsed = ! defaultOpen;
		}
	}

	const applyCollapsedState = ( isCollapsed ) => {
		root.classList.toggle( 'is-collapsed', isCollapsed );
		document.body.classList.toggle(
			'p2026-sidebar-shell-visible',
			! isCollapsed
		);
		document.documentElement.classList.toggle(
			'p2026-sidebar-shell-visible',
			! isCollapsed
		);

		if ( toggleButton ) {
			toggleButton.setAttribute(
				'aria-expanded',
				isCollapsed ? 'false' : 'true'
			);
		}
	};

	const persistCollapsedState = () => {
		if ( ! canToggle ) {
			return;
		}

		try {
			localStorage.setItem( STORAGE_KEY, String( collapsed ) );
		} catch {
			// Ignore storage errors (private mode, quota, etc).
		}
	};

	const focusFirstInsidePanel = () => {
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
	};

	const openSidebar = ( moveFocus = false ) => {
		collapsed = false;
		applyCollapsedState( false );
		persistCollapsedState();

		if ( moveFocus ) {
			window.requestAnimationFrame( focusFirstInsidePanel );
		}
	};

	const collapseSidebar = ( returnFocus = false ) => {
		collapsed = true;
		applyCollapsedState( true );
		persistCollapsedState();

		if ( returnFocus && toggleButton ) {
			toggleButton.focus();
		}
	};

	applyCollapsedState( collapsed );

	if ( canToggle ) {
		toggleButton.addEventListener( 'click', () => {
			if ( collapsed ) {
				openSidebar( true );
			} else {
				collapseSidebar( false );
			}
		} );

		document.addEventListener( 'keydown', ( event ) => {
			if ( event.key !== 'Escape' || collapsed ) {
				return;
			}

			collapseSidebar( true );
		} );
	}

	window.requestAnimationFrame( () => {
		root.classList.remove( 'is-initializing' );
	} );
}

onDomReady( mountSidebarShell );
