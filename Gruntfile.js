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
        src: ['test/unit/*.js', 'test/integration/*.js'],
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          debug: true
        }
      },
      main: {
        src: 'src/drop.js',
        dest: 'js/ledgerloops.js',
      }
    },
    watch: {
      js: {
        files: ['src/*.js'],
        tasks: ['build']
      }
    }
  });

  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-browserify');
  grunt.loadNpmTasks('grunt-contrib-watch');
 
  // Default task(s).
  grunt.registerTask('test', ['mochaTest']);
  grunt.registerTask('build', ['browserify']);
  grunt.registerTask('default', ['test', 'build']);

};
