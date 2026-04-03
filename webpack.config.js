/**
 * Custom webpack config extending @wordpress/scripts defaults.
 *
 * Keeps the default block auto-discovery (which generates the block manifest
 * and places built files alongside block.json in build/blocks/) and adds the
 * frontend enhancement script as an additional entry point.
 *
 * Chunk naming configured to produce semantic names for conditional modules:
 * - src/modules/mentions/ → chunk-mentions.js
 * - src/modules/notifications/ → chunk-notifications.js
 *
 * Cache-busting via query strings is handled by the PHP asset manifest system
 * (frontend.asset.php), which enqueues scripts with wp_enqueue_script( $handle,
 * $src, $deps, $version ) where $version is the build timestamp. WordPress
 * automatically appends the version as a query parameter.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: async () => ( {
		...( await defaultConfig.entry() ),
		frontend: './src/frontend.js',
		'audit-log-viewer': './src/modules/audit-log/audit-log-viewer.js',
	} ),
	output: {
		...defaultConfig.output,
		chunkFilename: 'chunk-[name].js',
		chunkLoading: defaultConfig.output.chunkLoading,
	},
	optimization: {
		...defaultConfig.optimization,
		chunkIds: 'deterministic',
		moduleIds: 'deterministic',
	},
};
