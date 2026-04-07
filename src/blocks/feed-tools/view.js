/**
 * feed-tools block — frontend view script.
 *
 * Mounts the shared SidebarControls React component into each rendered
 * p2026/feed-tools block instance.
 */
import { createElement, createRoot } from '@wordpress/element';
import { initApiFetch } from '../../api';
import SidebarControls from '../../modules/sidebar-shell/SidebarControls';

initApiFetch();

document.querySelectorAll( '[data-p2026-feed-tools]' ).forEach( ( node ) => {
	createRoot( node ).render( createElement( SidebarControls ) );
} );
