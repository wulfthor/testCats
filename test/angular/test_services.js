/**
 * Angular Services tests
 */

var search_term = "search string";
var search_filter =  {isOpen : true, 
                      sampleType : {name : 'Paint Cross Section'},
                      earliestDate : '1850',
                      latestDate : '1900'};
var search_items = 10; /*page size*/
var search_page = 1;   /*page number*/

var excel_url = "sample?fulltext=search string&sampletype=Paint Cross Section&startdate=1850&enddate=1900";
var search_url = "sample?pageSize=10&pageNum=1&fulltext=search string&sampletype=Paint Cross Section&startdate=1850&enddate=1900";
var searchsize_url = "sample?count=true&fulltext=search string&sampletype=Paint Cross Section&startdate=1850&enddate=1900";

describe('myApp.services', function() {

    /*check external interface exists and has a valid definition*/
    beforeEach(module('myApp.services'));
    
    describe("catsAPIservice", function() {
    
        var catsAPIservice;
        var httpBackend;

        /*get the service you want to test*/  
        beforeEach(inject(function(_catsAPIservice_, $httpBackend) {
            catsAPIservice = _catsAPIservice_;
            httpBackend = $httpBackend;
        }));

        it("catsAPIservice.search should build the correct url from the arguments", function () {
        
            /*this will only get hit if catsAPIservice.search builds the url correctly
             * it will mock the http service and send a response */
            httpBackend.whenGET(search_url).respond("ok");
        
            catsAPIservice.search(search_term, search_filter, search_items, search_page).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.searchSize should build the correct url from the arguments", function () {
        
            httpBackend.whenGET(searchsize_url).respond("ok");
        
            catsAPIservice.searchSize(search_term, search_filter).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.createSample should build the correct request from the arguments", function () {
            
            var create_sample_url = "sample";
            var create_sample_data = "sample data";
            var create_sample_headers = {'Content-Type' : 'application/json'};
        
            httpBackend.whenPOST(create_sample_url, create_sample_data).respond("ok");
        
            catsAPIservice.createSample(create_sample_data).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.delete should build the correct request from the argument", function () {
        
            var delete_sample_id = '12345';
            var delete_sample_url = 'sample/' + delete_sample_id;
        
            httpBackend.whenDELETE(delete_sample_url).respond("ok");
        
            catsAPIservice.delete(delete_sample_id).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.createArtwork should build the correct request from the arguments", function () {
        
            var create_artwork_url = "artwork";
            var create_artwork_data = "artwork data";
            var create_artwork_headers = {'Content-Type' : 'application/json'};
        
            httpBackend.whenPOST(create_artwork_url, create_artwork_data).respond("ok");
        
            catsAPIservice.createArtwork(create_artwork_data).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.readArtwork should build the correct url from the argument", function () {
        
            var artwork_id = "55555";
            var artwork_url = "artwork/" + artwork_id;
        
            httpBackend.whenGET(artwork_url).respond("ok");
        
            catsAPIservice.readArtwork(artwork_id).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.getVocab should build the correct url from the argument", function () {
        
            var vocab_type = "pigments";
            var vocab_url = "vocab/" + vocab_type;
        
            httpBackend.whenGET(vocab_url).respond("ok");
        
            catsAPIservice.getVocab(vocab_type).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.Excel should build the correct url from the arguments", function () {
        
            var excel_headers = {'Accept' : 'application/vnd.openxmlformats'};
        
            httpBackend.whenGET(excel_url, excel_headers).respond("ok");
        
            catsAPIservice.Excel(search_term, search_filter).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.login should build the correct request from the arguments", function () {
            
            var email = "user@smk.dk";
            var password = "secret";
            var login_url = "/login?username=" + email + "&password=" + password;
        
            httpBackend.whenPOST(login_url).respond("ok");
        
            catsAPIservice.login(email, password).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.logout should build the correct request from the arguments", function () {
            
            var logout_url = "/logout";
        
            httpBackend.whenPOST(logout_url).respond("ok");
        
            catsAPIservice.logout().then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.loggedin should build the correct url from the arguments", function () {
            
            var loggedin_url = "/loggedin";
        
            httpBackend.whenGET(loggedin_url).respond("ok");
        
            catsAPIservice.loggedin().then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
        it("catsAPIservice.updateUser should build the correct request from the argument", function () {
            
            var update_url = "user";
            var data = "data";
        
            httpBackend.whenPOST(update_url, data).respond("ok");
        
            catsAPIservice.updateUser(data).then(function(response) {
                response.data.should.equal("ok");
            });
            httpBackend.flush();
        });
    });
    describe("state service", function() {

        var state;
        var data = {part1: "something", part2 : "something else"};

        beforeEach(inject(function(_state_) {
            state = _state_;
        }));

        it("there must be a more meaningful test than this", function () {
            state.temp = data;
            state.temp.should.equal(data);
        });
    });
});