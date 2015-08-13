// Karma configuration
// Generated on Sat Nov 22 2014 21:53:03 GMT+0100 (CET)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['mocha', 'sinon-chai'],


    // list of files / patterns to load in the browser
    files: [
      'bower_components/angular/**/*.js',
      'bower_components/angular-mocks/**/*.js',
      'bower_components/angular-bootstrap/ui-bootstrap.js',
      'bower_components/ng-file-upload/angular-file-upload.js',
      'public/js/services.js',
      'public/js/controllers.js',
      'public/css/*.css',
      'test/angular/*.js'
      ],


    // list of files to exclude
    exclude: [
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    //comment out the preprocessors section for DEBUGGING
    preprocessors: {
        'public/js/services.js' :  ['coverage'],
        'public/js/controllers.js' :  ['coverage'] 

    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress', 'coverage'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    // set to 'Chrome' for DEBUGGING
    browsers: ['PhantomJS'],
//    browsers: ['Chrome'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits. 
    // Set false for DEBUGGING
    singleRun: true
//    singleRun: false

  });
};
