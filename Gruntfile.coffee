module.exports = (grunt) ->

	coffees = (cwd, dest)->
		expand: true
		cwd: cwd
		src: "*.coffee"
		dest: dest
		ext: ".js"

	grunt.initConfig
		pkg: grunt.file.readJSON 'package.json'
		meta:
			banner: '
			// <%= pkg.title || pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> \n
			<%= pkg.homepage ? "// " + pkg.homepage + "\n" : "" %>
			// Copyright (c) 2012 - <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;
			Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'

		clean:
			app:
				src: ["dist", "lib", "docs"]

		webpack:
			jefri:
				entry: './src/Runtime.coffee'
				output:
					filename: './lib/<%= pkg.name %>.js'
				resolve:
					extensions: ['', ".js", ".coffee"]
					alias:
						'request': './request/browser.coffee'
				module:
					loaders: [
						{ test: /\.coffee$/, loader: 'coffee-loader' }
					]
					noParse: [
						/util\/UUID/,
						/util\/request\/server/
					]

		uglify:
			dist:
				src: [
					"lib/<%= pkg.name %>.js"
				]
				dest: "lib/<%= pkg.name %>.min.js"

		connect:
			testing:
				root: '.'
				port: 8000

		mochaTest:
			options:
				# timeout: 1e6
				reporter: 'spec'
				require:
					"test/helpers.js"
			runtime:
				src: ["test/spec/node/**/*.coffee"]

		karma:
			client:
				options:
					browsers: ['Chrome']
					frameworks: [ 'mocha', 'sinon-chai' ]
					reporters: [ 'spec', 'junit', 'coverage' ]
					singleRun: true,
					logLevel: 'INFO'
					preprocessors:
						'test/**/*.coffee': [ 'coffee' ]
					files: [
						'lib/jefri.js',
						'test/spec/karma/**/*.coffee'
					]
					junitReporter:
						outputFile: 'build/reports/karma.xml'
					coverageReporter:
						type: 'lcov'
						dir: 'build/reports/coverage/'


	# These plugins provide necessary tasks.
	grunt.loadNpmTasks "grunt-mocha-test"
	grunt.loadNpmTasks "grunt-webpack"
	grunt.loadNpmTasks "grunt-contrib-watch"
	grunt.loadNpmTasks "grunt-contrib-qunit"
	grunt.loadNpmTasks "grunt-contrib-nodeunit"
	grunt.loadNpmTasks "grunt-contrib-uglify"
	grunt.loadNpmTasks "grunt-contrib-connect"
	grunt.loadNpmTasks "grunt-contrib-clean"
	grunt.loadNpmTasks "grunt-karma"

	# Default task.
	grunt.registerTask "distribute", ["uglify:dist"]
	grunt.registerTask "build", ["webpack:jefri", "distribute"]
	grunt.registerTask "testNode", ["connect:testing", "mochaTest:runtime"]
	grunt.registerTask "default", ["clean", "testNode", "build", "karma:client"]
