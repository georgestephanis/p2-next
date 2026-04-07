import onDomReady from '../../utils/on-dom-ready';
import './_sidebar-shell.scss';

const STORAGE_KEY = 'p2026.sidebarShell.collapsed';

function mountSidebarShell() {
	const root = document.querySelector( '[data-p2026-sidebar-shell]' );
	if ( ! root ) {
		return;
	}

	const toggleButton = root.querySelector( '.p2026-sidebar-shell__toggle' );
	if ( ! toggleButton ) {
		return;
	}

	const applyCollapsedState = ( collapsed ) => {
		root.classList.toggle( 'is-collapsed', collapsed );
		toggleButton.setAttribute(
			'aria-expanded',
			collapsed ? 'false' : 'true'
		);
	};

	let collapsed = true;
	try {
		collapsed = localStorage.getItem( STORAGE_KEY ) !== 'false';
	} catch {
		collapsed = true;
	}

	applyCollapsedState( collapsed );

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

onDomReady( mountSidebarShell );
