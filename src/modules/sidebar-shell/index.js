import onDomReady from '../../utils/on-dom-ready';
import { createElement } from '@wordpress/element';
import { createRoot } from '@wordpress/element';
import SidebarControls from './SidebarControls';
import './_sidebar-shell.scss';

const STORAGE_KEY = 'p2026.sidebarShell.collapsed';

function mountSidebarShell() {
	const root = document.querySelector( '[data-p2026-sidebar-shell]' );
	if ( ! root ) {
		return;
	}

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

		if ( toggleButton ) {
			toggleButton.setAttribute(
				'aria-expanded',
				collapsed ? 'false' : 'true'
			);
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
			collapsed = ! collapsed;
			applyCollapsedState( collapsed );
			try {
				localStorage.setItem( STORAGE_KEY, String( collapsed ) );
			} catch {
				// Ignore storage errors (private mode, quota, etc).
			}
		} );
	}

	if ( toolsSlot ) {
		createRoot( toolsSlot ).render( createElement( SidebarControls ) );
	}
}

onDomReady( mountSidebarShell );
