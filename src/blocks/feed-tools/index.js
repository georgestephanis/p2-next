/**
 * feed-tools block — editor (admin) registration.
 *
 * Shows a placeholder in the block editor; interactive controls mount on the
 * frontend via view.js.
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
				icon="filter"
				label={ __( 'Feed Tools', 'p2026' ) }
				instructions={ __(
					'Renders p2026 feed controls (search and filters) on the frontend.',
					'p2026'
				) }
			/>
		</div>
	);
}

registerBlockType( metadata.name, {
	edit: Edit,
	save() {
		return null;
	},
} );
