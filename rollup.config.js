
// import replace from 'rollup-plugin-replace';
// import alias from 'rollup-plugin-alias';
import typescript from 'rollup-plugin-typescript';
// import builtins from 'rollup-plugin-node-builtins'
// import nodeResolve from 'rollup-plugin-node-resolve';
// import commonjs from 'rollup-plugin-commonjs';
// import globals from 'rollup-plugin-node-globals';
// import json from 'rollup-plugin-json';

export default {
	plugins: [
		typescript(),
		// alias({
		// 	'fs': 'node_modules/browserify-fs/index.js',
		// 	'net': 'node_modules/net-browserify/browser.js',
		// 	'tls': 'nop.js' // 'node_modules/tls-browserify/index.js'
		// }),
		// replace({
		// 	"__dirname": JSON.stringify("") // why do i need to do this?
		// 	// "'fs'": JSON.stringify('browserify-fs'),
		// 	// "'net'": JSON.stringify('net-browserify'),
		// 	// "'tls'": JSON.stringify('tls-browserify'),
		// 	// '"fs"': JSON.stringify('browserify-fs'),
		// 	// '"net"': JSON.stringify('net-browserify'),
		// 	// '"tls"': JSON.stringify('tls-browserify')
		// }),
		// builtins(),
		// nodeResolve({
		// 	jsnext: true,
		// 	main: true,
		// 	browser: true
		// }),
		// commonjs({
		// 	exclude: [
		// 		'node_modules/rollup-plugin-node-globals/**',
		// 		'node_modules/rollup-plugin-node-builtins/src/es6/util.js',
		// 		'node_modules/rollup-plugin-node-builtins/node_modules/rollup-plugin-node-globals/**'
		// 	],
		// 	ignoreGlobal: true
		// 	// namedExports: {
		// 	// 	"node_modules/rollup-plugin-node-builtins/node_modules/inherits/inherits_browser.js": [ "default" ]
		// 	// }
		// }),
		// globals(),
		// json()
	]
}
