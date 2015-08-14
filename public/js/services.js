'use strict';

/* Services */

var serviceMod = angular.module('myApp.services', []).value('version', '0.1');

/*
 *  All the catsAPI services use http.get/post which return an HttpPromise:
 *
 *  Returns a promise object with the standard then method and two http specific methods:
 *  success and error. The then method takes two arguments a success and an error callback
 *  which will be called with a response object. The success and error methods take a single
 *  argument - a function that will be called when the request succeeds or fails respectively.
 *
 *  The arguments passed into these functions are destructured representations of the response
 *  object passed into the then method. The response object has these properties:
 *
 *  data – {string|Object} – The response body transformed with the transform functions.
 *  status – {number} – HTTP status code of the response.
 *  headers – {function([headerName])} – Header getter function.
 *  config – {Object} – The configuration object that was used to generate the request.
 *  statusText – {string} – HTTP status text of the response.
 *
*/

serviceMod.factory('catsAPIservice', ['$http',
function($http) {
    return {
        search : function(term, filter, items, page) {
            var url = "sample?pageSize=" + items + "&pageNum=" + page
                + ((!!term) ? "&fulltext=" + term : "");
            if (filter && filter.isOpen){
                url +=((!!filter.sampleType) ? "&sampletype=" + filter.sampleType.name : "")
                + ((!!filter.earliestDate) ? "&startdate=" + filter.earliestDate : "")
                + ((!!filter.latestDate) ? "&enddate=" + filter.latestDate : "");
            }
            //return $http.get(url);
            return $http({
                url : url,
                method : "GET",
                headers : {
                    'Accept' : 'application/json'
                }
            });
        },
        searchSize : function(term, filter) {
            var url = "sample?count=true"
                + ((!!term) ? "&fulltext=" + term : "");
            if (filter && filter.isOpen){
                url +=((!!filter.sampleType) ? "&sampletype=" + filter.sampleType.name : "")
                + ((!!filter.earliestDate) ? "&startdate=" + filter.earliestDate : "")
                + ((!!filter.latestDate) ? "&enddate=" + filter.latestDate : "");
            }
            return $http.get(url);
        },
        createSample : function(postData) {
            return $http({
                url : 'sample',
                method : "POST",
                data : postData,
                headers : {
                    'Content-Type' : 'application/json'
                }
            });
        },
        delete : function(id) {
            return $http({
                url : 'sample/' + id,
                method : "DELETE"
            });
        },
        createArtwork : function(postData) {
            return $http({
                url : 'artwork',
                method : "POST",
                data : postData,
                headers : {
                    'Content-Type' : 'application/json'
                }
            });
        },
        readArtwork : function(id) {
            var url = "artwork/" + id;
            return $http.get(url);
        },
        readDiff : function(id) {
            var url = "awdiff/" + id;
            console.log(url);
            return $http.get(url);
        },
        readArtworkFromSMK : function(id) {
            var url = "searchsmk?id=" + id;
            return $http.get(url);
        },
        getVocab : function(type) {
            var url = "vocab";
            if (type != undefined){
                url += "/" + type;
            }
            return $http.get(url);
        },
        Excel : function(term, filter) {
            var url = "sample?fulltext="
                + ((!!term) ? term : "");
            if (filter && filter.isOpen){
                url +=((!!filter.sampleType) ? "&sampletype=" + filter.sampleType.name : "")
                + ((!!filter.earliestDate) ? "&startdate=" + filter.earliestDate : "")
                + ((!!filter.latestDate) ? "&enddate=" + filter.latestDate : "");
            }
            return $http({
                url : url,
                method : "GET",
                responseType: 'arraybuffer', /*important!*/
                headers : {
                    'Accept' : 'application/vnd.openxmlformats'
                }
            });
        },
        login : function(email, password) {
            return $http({
                url : '/login?username=' + email + '&password=' + password,
                method : "POST",
            });
        },
        logout : function() {
            return $http({
                url : '/logout',
                method : "POST",
            });
        },
        loggedin : function() {
            var url = "/loggedin";
            return $http.get(url);
        },
        updateUser : function(postData) {
            return $http({
                url : 'user',
                method : "POST",
                data : postData,
                headers : {
                    'Content-Type' : 'application/json'
                }
            });
        },
    };
}]);

serviceMod.factory("state", [
function() {
    'use strict';
    var state = {};

    return {
        state : state
    };
}]);


