module.exports = function(grunt) {
	
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		watch: {
			files: [ "source/script/**.js" ],
			tasks: [ "build" ]
		},
		browserify: {
			minifyify: {
				src: "source/script/main.js",
				dest: "source/viewer.js",
				options: {
					plugin: [[
						"minifyify", {
							map: "viewer.js.map",
							output: "source/viewer.js.map",
							compressPath: function (p) {
								var path = require("path");
								return path.relative(__dirname, p);
							},
							minify: {
								mangle: true
							}
						}
					]],
					browserifyOptions: {
						debug: true
					}
				}
			},
			debug: {
				src: "source/script/main.js",
				dest: "source/viewer.js",
				options: {
					browserifyOptions: {
						debug: true
					}
				}
			}
		}
	});
	
	grunt.loadNpmTasks("grunt-browserify");
	grunt.loadNpmTasks("grunt-contrib-watch");
	
	grunt.registerTask("default", [ "build", "watch" ]);
	grunt.registerTask("build", [ "browserify:debug" ]);
	
};
