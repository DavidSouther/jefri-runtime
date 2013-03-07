/* global module:false */
module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		meta: {
			banner: '// <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
				'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
				'<%= pkg.homepage ? "// " + pkg.homepage + "\n" : "" %>' +
				'// Copyright (c) 2012 - <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
				' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'
		},
		clean: {
			app: {
				src: ["dist", "docs"]
			}
		},
		livescript: {
			app: {
				files: {
					"dist/compiled/Runtime.js": 'src/Runtime.ls',
					"dist/compiled/Transaction.js": 'src/Transaction.ls',
				},
				options: {
					bare: true,
					util: true
				}
			},
			nunit: {
				files: {
					"test/nunit/tests.js": ["test/nunit/**/*ls"]
				}
			},
			qunit: {
				files: [{
					expand: true,
					cwd: "test/qunit/min/ls/",
					src: "*ls",
					dest: "test/qunit/min/ls/compiled/",
					ext: '.js'
				}],
				options: {
					bare: true
				}
			},
			jasmine: {
				files: [{
					expand: true,
					cwd: "test/spec/node/ls/",
					src: "*ls",
					dest: 'test/spec/node/spec/',
					ext: '.spec.js'
				}],
			}
		},
		concat: {
			node: {
				src: ['<banner:meta.banner>', 'src/node/pre.js', 'dist/compiled/Runtime.js', 'dist/compiled/Transaction.js', 'src/node/post.js'],
				dest: 'lib/<%= pkg.name %>.js'
			},
			min: {
				src: ['<banner:meta.banner>', 'src/min/pre.js', 'dist/compiled/Runtime.js', 'dist/compiled/Transaction.js', 'src/min/post.js'],
				dest: 'lib/<%= pkg.name %>.min.js'
			},
			qunitMin: {
				src: ['test/qunit/min/js/*.js', 'test/qunit/min/ls/tests.js'],
				dest: 'test/qunit/min/tests.js'
			}
		},
		jasmine_node: {
			projectRoot: 'test/spec/node',
			specFolderName: 'spec',
			match: "",
			matchall: true
		},
		test: {
			files: ['test/nunit/**/*js']
		},
		qunit: {
			min: {
				src: ['http://localhost:8000/test/qunit/min/qunit.html']
			}
		},
		browserify: {
			"dist/bundle.js": {
				entries: ["<%= pkg.name %>.js"]
			}
		},
		min: {
			dist: {
				src: ['<banner:meta.banner>', '<config:concat.dist.dest>'],
				dest: 'lib/<%= pkg.name %>.min.js'
			}
		},
		watch: {
			app: {
				files: ["src/*ls", "test/**/*"],
				tasks: ["default"]
			}
		},
		connect: {
			test: {
				options: {
					port: 8000,
					base: '.'
				}
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib');
	grunt.loadNpmTasks('grunt-livescript');
	grunt.loadNpmTasks('grunt-jasmine-node');

	grunt.registerTask('jasmineTests', ['livescript:jasmine', 'jasmine_node']);
	grunt.registerTask('qunitTests', ['livescript:qunit', 'concat:qunitMin', 'qunit:min']);
	grunt.registerTask('nunitTests', ['livescript:nunit', 'nunit']);
	grunt.registerTask('tests', ['connect:test', 'qunitTests', 'jasmineTests']);
	grunt.registerTask('default', ['clean', 'livescript', 'concat:node', 'concat:min', 'tests']);
};
