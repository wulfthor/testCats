module.exports = function(grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        /*run backend tests*/
        mocha_istanbul: {
            coverage: {
                src: 'test/node/test_node.js'
            }
        },
        /*run frontend tests*/
        karma: {
            unit: {
                configFile: 'karma.conf.js'
            }
        },
        /*prepare files for production*/
        clean: ["./dist/"],
        copy: {
            main: {
              src: './views/**',
              dest: './dist/',
            },
        },
        /*minify for production*/
        jadeUsemin: {
            scripts: {
                options: {
                    tasks: {
                        js: ['concat', 'uglify'],
                        css: ['concat', 'cssmin']
                    }
                },
                files: [{
                    dest: './dist/views/index.jade',
                    src: './views/index.jade'
                },{
                    dest: './dist/views/layout.jade',
                    src: './views/layout.jade'
                }]
            }
        }
  });

  /* Load the plugins that provide the tasks */
  //grunt.loadNpmTasks('grunt-contrib-clean');
  //grunt.loadNpmTasks('grunt-contrib-copy');
  //grunt.loadNpmTasks('grunt-contrib-cssmin');
  //grunt.loadNpmTasks('grunt-jade-usemin');
  //grunt.loadNpmTasks('grunt-contrib-uglify');
  //grunt.loadNpmTasks('grunt-contrib-concat');
  //grunt.loadNpmTasks('grunt-karma');
  //grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-mocha-istanbul')
  
  /* Default task(s) to run when 'grunt' command is used*/
  grunt.registerTask('default', ['mocha_istanbul', 'karma', 'clean', 'copy', 'jadeUsemin']);
};
