/**
 * Custom webpack config extending @wordpress/scripts defaults.
 *
 * Keeps the default block auto-discovery (which generates the block manifest
 * and places built files alongside block.json in build/blocks/) and adds the
 * frontend enhancement script as an additional entry point.
 *
 * Chunk naming configured to produce semantic names for conditional modules:
 * - src/modules/mentions/ → chunk-mentions.{js,css}
 * - src/modules/notifications/ → chunk-notifications.{js,css}
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: async () => ( {
		...( await defaultConfig.entry() ),
		frontend: './src/frontend.js',
	} ),
	output: {
		...defaultConfig.output,
		chunkFilename: 'chunk-[name].[contenthash:8].js',
		chunkLoading: defaultConfig.output.chunkLoading,
	},
	optimization: {
		...defaultConfig.optimization,
		chunkIds: 'deterministic',
		moduleIds: 'deterministic',
	},
};
