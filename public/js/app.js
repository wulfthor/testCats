'use strict';

// Declare app level module which depends on filters, and services

angular.module('myApp', [
  'myApp.controllers',
  'myApp.filters',
  'myApp.services',
  'myApp.directives',
  'ngRoute',
  'ngAnimate',
  'ui.multiselect',
  'ui.catsmultiselect',
  'ui.catsartistselect',
  'toggle-switch'
]).
config(['$routeProvider', '$locationProvider' , 

function ($routeProvider, $locationProvider) {
    
    /* controllers can be defined here OR using ng-controller directive in the view (jade file),
     * but not both places
     * */
  $routeProvider.
    when('/browse', {
      templateUrl: 'partials/browse',
      controller: 'BrowseController'
    }).
    when('/view', {
      templateUrl: 'partials/view',
      controller: 'ViewController'
    }).
    when('/search', {
        templateUrl: 'partials/search',
        controller: 'SearchController'
    }).
    otherwise({
      redirectTo: '/browse'
    });

  $locationProvider.html5Mode(true);
}]);
