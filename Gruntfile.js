module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false) 
        },
        src: ['test/unit/*.ts', 'test/integration/*.ts'],
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true
        }
      },
      main: {
        src: 'lib/drop.js',
        dest: 'js/networkledger.js',
      }
    },
    typescript: {
      base: {
        src: ['src/**/*.ts'],
        dest: 'lib/',
        options: {
          module: 'amd', //or commonjs
          target: 'es2015', //or es3
          sourceMap: true,
          declaration: true
        }
      }
    },
    watch: {
      js: {
        files: ['src/**/*.ts'],
        tasks: ['build']
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-typescript');
 
  // Default task(s).
  grunt.registerTask('test', ['mochaTest']);
  grunt.registerTask('build', ['typescript', 'browserify']);
  grunt.registerTask('default', ['test', 'build']);

};
