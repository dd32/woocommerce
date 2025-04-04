/**
 * External packages
 */
const path = require( 'path' );

// These modules need to be transformed because they are not transpiled to CommonJS.
// The top-level keys are the names of the packages and the values are the file
// regexes that need to be transformed. Note that these are relative to the
// package root and should be treated as such.
const transformModules = {
	'is-plain-obj': {
		'index\\.js$': 'babel-jest',
	},
	lib0: {
		'.*\\.js$': 'babel-jest',
	},
	'y-protocols': {
		'.*\\.js$': 'babel-jest',
	},
};

/**
 * To ensure consistency in the test environment, all test files should use the same instance of the WP packages from the project's node_modules. This prevents potential conflicts with different versions of the packages. For example, a specific version of @wordpress/private-apis is defined in the package.json, but different instances can be used due to sub-dependencies having specific versions, which can cause issues.
 *
 * This approach aligns the test environment more closely with production, where the same version of the WP packages is used.
 *
 * Add additional mappings for other WP packages that are used in the project if needed.
 */
const mapWpModules = [
	'@wordpress/private-apis',
	'@wordpress/core-data',
	'@wordpress/components',
];
const wpModulesMapper = mapWpModules.reduce( ( acc, module ) => {
	try {
		// Excluding mappings for imports with suffixes like /build/index.js so that we can import the build/index.js file directly.
		acc[ `^${ module }$` ] = require.resolve( module );
	} catch ( error ) {
		// If the module is not found, no need to add it to the mapper.
	}
	return acc;
}, {} );

module.exports = {
	moduleNameMapper: {
		tinymce: path.resolve( __dirname, 'build/mocks/tinymce' ),
		'@woocommerce/settings': path.resolve(
			__dirname,
			'build/mocks/woocommerce-settings'
		),
		'@woocommerce/tracks': path.resolve(
			__dirname,
			'build/mocks/woocommerce-tracks'
		),
		'~/(.*)': path.resolve(
			__dirname,
			'../../../plugins/woocommerce/client/admin/client/$1'
		),
		'\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
			path.resolve( __dirname, 'build/mocks/static' ),
		'\\.(scss|css)$': path.resolve(
			__dirname,
			'build/mocks/style-mock.js'
		),
		// Force some modules to resolve with the CJS entry point, because Jest does not support package.json.exports.
		'lib0/webcrypto': require.resolve( 'lib0/webcrypto' ), // use the CJS entry point so that it uses the node:crypto API as jsdom doesn't have a crypto API
		uuid: require.resolve( 'uuid' ),
		memize: require.resolve( 'memize' ),
		...wpModulesMapper,
	},
	restoreMocks: true,
	setupFiles: [
		path.resolve( __dirname, 'build/setup-window-globals.js' ),
		path.resolve( __dirname, 'build/setup-globals.js' ),
	],
	setupFilesAfterEnv: [
		path.resolve( __dirname, 'build/setup-react-testing-library.js' ),
	],
	testMatch: [
		'**/__tests__/**/*.[jt]s?(x)',
		'**/test/*.[jt]s?(x)',
		'**/?(*.)test.[jt]s?(x)',
	],
	testPathIgnorePatterns: [
		'\\.d\\.ts$', // This regex pattern matches any file that ends with .d.ts
	],
	// The keys for the transformed modules contains the name of the packages that should be transformed.
	transformIgnorePatterns: [
		'node_modules/(?!(?:\\.pnpm|' +
			Object.keys( transformModules ).join( '|' ) +
			')/)',
		__dirname,
	],
	// The values for the transformed modules contain an object with the transforms to apply.
	transform: Object.entries( transformModules ).reduce(
		( acc, [ moduleName, transform ] ) => {
			for ( const key in transform ) {
				acc[ `node_modules/${ moduleName }/${ key }` ] =
					transform[ key ];
			}

			return acc;
		},
		{
			'(?:src|client|assets/js)/.*\\.[jt]sx?$': 'ts-jest',
		}
	),
	testEnvironment: 'jest-environment-jsdom',
	timers: 'modern',
	verbose: true,
	cacheDirectory: path.resolve(
		__dirname,
		'../../../node_modules/.cache/jest'
	),
};
