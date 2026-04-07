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
const DependencyExtractionWebpackPlugin = require( '@wordpress/dependency-extraction-webpack-plugin' );

const defaultPlugins = defaultConfig.plugins || [];
const pluginsWithoutDependencyExtraction = defaultPlugins.filter(
	( plugin ) =>
		plugin?.constructor?.name !== 'DependencyExtractionWebpackPlugin'
);

const classicConfig = {
	...defaultConfig,
	entry: async () => ( {
		...( await defaultConfig.entry() ),
		frontend: './src/frontend.js',
		'audit-log-viewer': './src/modules/audit-log/audit-log-viewer.js',
		'sidebar-shell-admin': './src/modules/sidebar-shell/admin.js',
	} ),
	output: {
		...defaultConfig.output,
		clean: false,
		chunkFilename: 'chunk-[name].js',
		chunkLoading: defaultConfig.output.chunkLoading,
	},
	optimization: {
		...defaultConfig.optimization,
		chunkIds: 'deterministic',
		moduleIds: 'deterministic',
	},
};

const interactivityModuleConfig = {
	...defaultConfig,
	name: 'p2026-interactivity-module',
	entry: {
		'interactivity-module': './src/interactivity/module-entry.js',
	},
	experiments: {
		...( defaultConfig.experiments || {} ),
		outputModule: true,
	},
	output: {
		...defaultConfig.output,
		clean: false,
		filename: 'interactivity.module.js',
		chunkFilename: 'mchunk-[name].js',
		module: true,
		chunkFormat: 'module',
		environment: {
			...( defaultConfig.output?.environment || {} ),
			module: true,
		},
		library: {
			type: 'module',
		},
	},
	optimization: {
		...defaultConfig.optimization,
		chunkIds: 'deterministic',
		moduleIds: 'deterministic',
	},
	plugins: [
		...pluginsWithoutDependencyExtraction,
		new DependencyExtractionWebpackPlugin( {
			useDefaults: false,
			requestToExternalModule( request ) {
				if ( request === '@wordpress/interactivity' ) {
					return request;
				}
			},
		} ),
	],
};

module.exports = [ classicConfig, interactivityModuleConfig ];
