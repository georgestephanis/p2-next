import onDomReady from '../../utils/on-dom-ready';
import { createElement } from '@wordpress/element';
import { createRoot } from '@wordpress/element';
import SidebarControls from './SidebarControls';
import './_sidebar-shell.scss';

const STORAGE_KEY = 'p2026.sidebarShell.collapsed';
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function mountSidebarShell() {
	const root = document.querySelector( '[data-p2026-sidebar-shell]' );
	if ( ! root ) {
		return;
	}

	const panel = root.querySelector( '#p2026-sidebar-shell-panel' );
	const toggleButton = root.querySelector( '.p2026-sidebar-shell__toggle' );
	const allowCollapse = root.dataset.allowCollapse !== '0';
	const defaultOpen = root.dataset.defaultOpen !== '0';
	const canToggle = allowCollapse && !! toggleButton;

	const toolsSlot = root.querySelector( '[data-p2026-sidebar-shell-tools]' );

	const applyCollapsedState = ( collapsed ) => {
		root.classList.toggle( 'is-collapsed', collapsed );
		document.body.classList.toggle(
			'p2026-sidebar-shell-visible',
			! collapsed
		);
		document.documentElement.classList.toggle(
			'p2026-sidebar-shell-visible',
			! collapsed
		);

		if ( toggleButton ) {
			toggleButton.setAttribute(
				'aria-expanded',
				collapsed ? 'false' : 'true'
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

	let collapsed = ! defaultOpen;
	if ( canToggle ) {
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
	} else {
		collapsed = false;
	}

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

	if ( toolsSlot ) {
		createRoot( toolsSlot ).render( createElement( SidebarControls ) );
	}

	window.requestAnimationFrame( () => {
		root.classList.remove( 'is-initializing' );
	} );
}

onDomReady( mountSidebarShell );
