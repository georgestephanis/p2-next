/**
 * new-post block — frontend view script.
 *
 * Entry point: mounts the NewPostEditor React component into the container
 * div that render.php outputs.
 */
import { createElement, createRoot } from '@wordpress/element';
import { registerCoreBlocks } from '@wordpress/block-library';
import { setDefaultBlockName } from '@wordpress/blocks';
import '@wordpress/format-library';
import { initApiFetch } from '../../api';
import NewPostEditor from '../../components/NewPostEditor';

// Register core block types so createBlock() and the BlockEditor work on the
// frontend. WordPress only does this in the admin by default.
// Guard against double-registration when frontend.js is also on the page.
if ( ! window.__p2NextBlocksRegistered ) {
	window.__p2NextBlocksRegistered = true;
	registerCoreBlocks();
	setDefaultBlockName( 'core/paragraph' );
}

// Ensure @wordpress/api-fetch is wired up with our nonce / root URL.
initApiFetch();

const root = document.getElementById( 'p2-next-new-post' );
if ( root ) {
	createRoot( root ).render( createElement( NewPostEditor ) );
}
