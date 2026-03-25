/**
 * Custom webpack config extending @wordpress/scripts defaults.
 *
 * Keeps the default block auto-discovery (which generates the block manifest
 * and places built files alongside block.json in build/blocks/) and adds the
 * frontend enhancement script as an additional entry point.
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );

module.exports = {
	...defaultConfig,
	entry: async () => ( {
		...( await defaultConfig.entry() ),
		frontend: './src/frontend.js',
	} ),
};
