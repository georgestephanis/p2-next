/**
 * new-post block — editor (admin) registration.
 *
 * Shows a static placeholder in the FSE/block editor so the block can be
 * placed in a template. The interactive editor only runs on the frontend
 * via view.js.
 */
import { registerBlockType } from '@wordpress/blocks';
import { useBlockProps } from '@wordpress/block-editor';
import { Placeholder } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import metadata from './block.json';

function Edit() {
	return (
		<div { ...useBlockProps() }>
			<Placeholder
				icon="edit"
				label={ __( 'New Post Editor', 'p2-next' ) }
				instructions={ __(
					'This block renders a live Block Editor on the frontend, allowing visitors to create posts without leaving the page.',
					'p2-next'
				) }
			/>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: Edit,
	save() {
		return null; // Dynamic block — rendered by render.php.
	},
} );
