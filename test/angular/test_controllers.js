/**
 * Angular Controller Tests
 */

describe('Controller Tests', function() {
    
    beforeEach(module('myApp.controllers'));

    var state = {};

    beforeEach(module(function($provide) {
        $provide.provider('state', function() {
            this.$get = function() {
                return state;
            };
        });
    }));
    
    describe('AppCtrl Tests', function() {

        var scope, appCtrl, location, httpBackend, modal, catsAPIservice, deferred;
        
        beforeEach(module(function($provide) {
            $provide.provider('catsAPIservice', function() {
                this.$get = function($http, $q) {
                    deferred = $q.defer();
                    return {
                        getVocab : function(type) {
                            /* getVocab is called on controller initialisation
                             * To emulate httpPromise we need to return a promise with success and 
                             * error handlers which call the function which is passed to them */
                            deferred.promise.success = function (fn) {
                                /*call success handler immediately*/ 
                                fn([{_id:"123", items:"valid sample array"}]);
                                return deferred.promise;
                            };
                            deferred.promise.error = function (fn) {
                                /*call error handler immediately*/ 
                                fn("error");
                                return deferred.promise;
                            };
                            return deferred.promise;
                        },
                        loggedin : function() {
                            /* loggedin is called on controller initialisation
                             * call success handler immediately: 0 == not logged in */ 
                            deferred.promise.success = function (fn) {
                                fn("0");
                                return deferred.promise;
                            };
                            deferred.promise.error = function (fn) {
                                // fn("error");
                                return deferred.promise;
                            };
                            return deferred.promise;
                        },
                        logout : function() {
                            /* logout is triggered by button press */ 
                            deferred.promise.success = function (fn) {
                                fn();
                                // deferred.promise.then(fn);
                                return deferred.promise;
                            };
                            deferred.promise.error = function (fn) {
                                //   fn();
                                deferred.promise.then(null, fn);
                                return deferred.promise;
                            };
                            return deferred.promise;
                        },
                    };
                };
            });
        }));
        
        beforeEach(inject(function($controller, $rootScope, $httpBackend,
                                    _state_, $location, $modal) {

            scope = $rootScope.$new();
            httpBackend = $httpBackend;
            location = $location;
            modalInstance = { 
                open : sinon.stub($modal, "open")
            };
    
            appCtrl = $controller('AppCtrl', { 
                $scope: scope, 
                $httpBackend : httpBackend,
                $location: location,
                $modal: modalInstance
            });	
        }));

        describe('controller init', function() {
            it('should initialise state variables', function(){ 
                expect(state.sampleTypes.should.equal("valid sample array"));
                expect(state.searchRequested.should.equal(false));
                state.loggedin.should.equal(false);
                expect(state.email.should.equal(''));
            });
        });
        
        describe('open login dialog event', function() {
            it('should open login modal', function(){
                scope.loginUser();
                /*expected return value copied from controllers.js*/
                modalInstance.open.calledWith({
                    size: 'sm',
                    templateUrl:'myLoginContent',
                    controller: loginModalInstanceCtrl
                }).should.be.ok;
            });
        });

        describe('logged in event', function() {
            it('should set scope logged in to true', function(){
                expect(scope.loggedin.should.equal(false));
                state.loggedin = true; /*trigger watch()*/
                scope.$apply();
                expect(scope.loggedin.should.equal(true));
            });
        });

        describe('logout click event', function() {
            it('should set state logged in to false', function(){
                state.loggedin = true;
                scope.$apply();
                expect(scope.loggedin.should.equal(true));
                scope.logout();
                expect(scope.loggedin.should.equal(false));
            });
        });

        describe('search event', function() {
            it('should change to searching state', function(){
                var searchTerm = "find me";
                expect(state.searchRequested.should.equal(false));
                expect(location.path().should.equal(''));
                scope.searchClicked(searchTerm);
                expect(state.searchRequested.should.equal(true));
                expect(location.path().should.equal('/search'));
                expect(state.searchTerm.should.equal(searchTerm));
            });
        });
    });
    
    describe('SearchCtrl Tests', function() {
        
        var scope, searchCtrl, location, httpBackend, modal, q, log,
            deferred_search, deferred_search_count, deferred_delete,
            search_result = {success:"results list"},
            search_result_size = 16;
        
        beforeEach(module(function($provide) {
            $provide.provider('catsAPIservice', function() {
                this.$get = function($http, $q) {
                    
                    deferred_search = $q.defer();
                    deferred_search_count = $q.defer();
                    deferred_delete = $q.defer();

                    return {
                        search : function() {
                            /* Emulate 'httpPromise'
                             * Setup functions on promises which take care
                             * of remembering the success/error callbacks */
                            deferred_search.promise.success = function (fn) {
                                deferred_search.promise.resolve = fn;
                                return deferred_search.promise;
                            };
                            return deferred_search.promise;
                        },
                        searchSize : function() {
                            deferred_search_count.promise.success = function (fn) {
                                deferred_search_count.promise.resolve = fn;
                                return deferred_search_count.promise;
                            };
                            deferred_search_count.promise.error = function (fn) {
                                deferred_search_count.promise.reject = fn;
                                return deferred_search_count.promise;
                            };
                            return deferred_search_count.promise;
                        },
                        delete : function() {
                            deferred_delete.promise.success = function (fn) {
                                deferred_delete.promise.resolve = fn;
                                return deferred_delete.promise;
                            };
                            return deferred_delete.promise;
                        },
                    };
                };
            });
        }));
       
        beforeEach(inject(function($controller, $q, $rootScope, 
                                  _state_, $modal, $log, $location) {

            scope = $rootScope.$new();
            location = $location;
            modalInstance = { 
                open : sinon.stub($modal, "open")
            };
            
            searchCtrl = $controller('SearchController', { 
                $q: q,
                $scope: scope, 
                $modal: modalInstance,
                $location: location,
                $log: log
            }); 
        }));

        describe('logged in event', function() {
            it('should set scope logged in to true', function(){
                state.loggedin = false; /*watch() should catch this*/
                scope.$apply();
                expect(scope.loggedin.should.equal(false));
                state.loggedin = true; /*trigger watch()*/
                scope.$apply();
                expect(scope.loggedin.should.equal(true));
            });
        });
        
//        describe('if scope filter changes', function() {
//            it('state should update', function(){
//                var filter = {test:""};
//                scope.filter = filter; 
//                scope.$apply();
//                filter = {test:"any object"};
//                scope.filter = filter; 
//                scope.$apply();
//                expect(state.filter.should.equal(filter));
//            });
//        });
        
        describe('search requested', function() {
            it('should call search', function(){
                var searchTerm = "find me";
                expect(state.searchRequested.should.equal(false));
                state.searchTerm = searchTerm;
                scope.$apply();
                state.searchRequested = true;
                scope.$apply();
                expect(state.searchRequested.should.equal(false)); /*flag has been reset*/
            });
            it('should handle results', function(){
                /*request search*/
                scope.search();
                /*receive results (success)*/
                deferred_search.promise.resolve(search_result);
                
                expect(scope.searchResultsPage.should.equal(search_result));
                expect(state.searchResultsPage.should.equal(search_result));
            });
            it('should handle results count', function(){
                /*request search count*/
                scope.searchCount(); 
                /*receive results (success)*/
                deferred_search_count.promise.resolve(search_result_size); 
                
                expect(scope.searchResultsTotalSize.should.equal(search_result_size));
                expect(state.searchResultsTotalSize.should.equal(search_result_size));
            });
            it('should handle error in results count', function(){
                /*request search count */
                scope.searchCount(); 
                /*receive results (error)*/
                deferred_search_count.promise.reject(); 
                
                expect(scope.searchResultsTotalSize.should.equal(0));
                expect(state.searchResultsTotalSize.should.equal(0));
            });
        });
        describe('filter changed', function() {
            it('set search requested flag, update state', function(){
                var filter = {test:""};
                expect(state.searchRequested.should.equal(false));
                scope.filter = filter;
                
                scope.filterChanged();
                
                expect(state.searchRequested.should.equal(true)); 
                expect(state.filter.should.equal(filter)); 
            });
        });
        describe('view sample event', function() {
            it('should change to view mode with the correct sample', function(){
                var result = {result: "first result"},
                    index = 0;
                
                state.searchResultsPage = [result];
                
                scope.viewSample(index);
                
                expect(location.path().should.equal('/view'));
                expect(state.sample.should.equal(result));
                expect(state.itemIndex.should.equal(index));
                expect(state.create.should.equal(false));
            });
        });
        describe('register new sample event', function() {
            it('should notify register controller', function(){
                var sample = {sample: "a sample"};
                
                scope.registerClicked(sample);
                
                expect(state.registerRequested.should.equal(true));
            });
            it('should prepare the sample', function(){
                var sample = {sample: "a sample"};
                
                scope.registerClicked(sample);
                
                expect(state.sample.should.equal(sample));
            });
        });
        describe('register new sample event', function() {
            it('should notify register controller', function(){
                var sample = {sample: "a sample"};
                state.searchRequested = false;
                
                scope.deleteClicked(sample);
                deferred_delete.promise.resolve(); 
                
                expect(state.searchRequested.should.equal(true));
            });
        });
    });
});



/* update $q to include success and error handlers, just like httpPromise
 * useful for understanding httpPromise and how $http maps "then" to "success"
 * and "error"
*/
//$provide.decorator('$q', function ($delegate) {
//    var defer = $delegate.defer;
//    $delegate.defer = function () {
//      var deferred = defer();
////      deferred.promise.success = function (fn) {
////        deferred.promise.then(fn);
////        return deferred.promise;
////      };
//      deferred.promise.error = function (fn) {
//        deferred.promise.then(null, fn);
//        return deferred.promise;
//      };
//      return deferred;
//    };
//    return $delegate;
//  });