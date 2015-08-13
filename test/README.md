##About the tests and testing tools

###Server API tests

The Server tests (/test/node/) are written using the **Mocha** framework. We use the Mocha "BDD" interface which provides describe(), it(), before(), after(), beforeEach() and afterEach(). These methods allow us to organise our tests and enable serial testing of asynchronous interfaces (basically, by calling the done() callback when each test is complete). 

Within the tests the **Chai** assertion framework is used. Chai also supports the BDD style, providing the should() and expect() interfaces to construct chain capable assertions (eg. result.should.be.a('string')).

Here is what we are testing on the server: The Server API tests build and send asynchronous API requests to the server, wait for a result and then check if the result returned by the server is as expected.

To run just the server tests (with coverage information from the **Istanbul** tool) then run this command from the project root (however, we use 'grunt' instead, see below):

    istanbul cover _mocha -- test/node/ -R spec

The test results are output to stdout. The coverage report can be found at /coverage/lcov-report/angular-express-seed/index.html


###Application Unit tests

To run the application unit tests (/test/angular/) we use the **Karma** tool (as browsers cannot natively load, run and report on tests). These tests are also written in Mocha with Chai assertions. Karma will serve these tests to the browser. We use the headless **PhantomJS** browser, but switch to Firefox or Chrome when debugging the tests (This is done in karma.conf.js : just search for the term 'DEBUGGING' and follow the instructions).

The unit tests are split into separate files based around Angularjs architecture (eg, test_controllers.js, test_services.js).

Here is what we are testing: calling each method, stubbing the services used by the method and checking that the state of the method and scope variables matches expectations. The hardest part to follow is stubbing the http services, as it involves emulating and resolving httpPromises.

The unit tests can be run from project root with the following command (however, we use 'grunt' instead, see below):

    karma start

The test results are output to stdout. The coverage report can be found at /coverage/PhantomJS 1.9.8/index.html

###Running tests automatically

We use the **grunt** build tool to manage the build. This must be run before each new deployment, and part of this includes running the tests. The configuration for this can be found in "gruntfile.js". Currently it handles the following tasks:

* runs the server tests and generates code coverage info
* runs the frontend tests and generates code coverage info
* cleans up and prepares a production code directory
* preprocesses (minify, uglify) the source code for production

To run this, just call this command:

    grunt






