var should = require('chai').should();
var app = require("../../app");
var request = require('supertest');
var db = require("../../db_mongo");

var cookie;

/* sample */
var sample_reference_number = "testSample1234";
var sample_id = "5464ef0f9758a3100dea28c5"; /* any random hex */
var sample = { "_id" : sample_id, "paintLayer" : [  { "id" : 1, "layerType" : { "name" : "Ground", "secondaryname" : "", "grp" : "" }, "paintBinderbinder" : [ ], "colour" : [ { "name" : "black", "secondaryname" : "sort", "grp" : "" }, { "name" : "blue", "secondaryname" : "blå", "grp" : "" }, { "name" : "brown", "secondaryname" : "brun", "grp" : "" }, { "name" : "fddd", "secondaryname" : "", "grp" : "" }, { "name" : "green", "secondaryname" : "grøn", "grp" : "" }, { "name" : "grey", "secondaryname" : "grå", "grp" : "" }, { "name" : "orange", "secondaryname" : "orange", "grp" : "" }, { "name" : "purple", "secondaryname" : "lilla", "grp" : "" }, { "name" : "red", "secondaryname" : "rød", "grp" : "" }, { "name" : "white", "secondaryname" : "hvid", "grp" : "" }, { "name" : "yellow", "secondaryname" : "gul", "grp" : "" } ], "pigment" : [ { "name" : "lamp black", "secondaryname" : "trækulsort", "grp" : "" }, { "name" : "lead white", "secondaryname" : "blyhvidt", "grp" : "" } ], "dye" : [ { "name" : "asphalt", "secondaryname" : "asfalt", "grp" : "" }, { "name" : "indigo", "secondaryname" : "indigo", "grp" : "" } ], "active" : true, "paintBinder" : [ { "name" : "emulsion", "secondaryname" : "emulsion", "grp" : "" }, { "name" : "synthetic", "secondaryname" : "syntetisk", "grp" : "" } ] }  ], "sampleAnalysis" : [ { "id" : "1", "type" : "", "description" : "", "referenceNumber" : "", "date" : "", "employee" : "", "owner" : "", "originLocation" : "", "location" : "", "results" : "", "active" : true } ], "images" : [ ], "sampleType" : { "id" : "paint", "name" : "Paint Cross Section", "grp" : "Physical samples" }, "referenceNumber" : sample_reference_number };
var unknown_sample_id = '5464efffff58a3100dea28c5';

/* artwork */
var artwork_id = "5460ffffe6b9e5aa3ddffb9c"; /* any random hex */
var inventory_number = "KMSsp740xxx";
var artwork = { "_id" : artwork_id, "corpusId" : "1ba63e2f-4591-40f2-992f-9757fef6903a", "externalurl" : "http://cspic.smk.dk/globus/40412321/img0426.jpg", "inventoryNum" : inventory_number, "title" : "Portræt af en lutspiller", "productionDateEarliest" : "Tue Jan 01", "productionDateLatest" : "Thu Dec 31", "artist" : "Jan van Scorel, Hans Holbein d.Y., Christoph Amberger", "dimensions" : "44 x 32.5 cm", "nationality" : "Dutch, German, German", "technique" : "Oil on canvas, transferred from panel" };

/* user */
var email = "test.user@smk.dk";
var unknown_email = "another.test.user@smk.dk";
var password = "test123";
var role = "default";
var default_credentials = {"username": email, "password": password, "role": role};
var user_no_pwd = {"username": email, "role": role};
var user_empty_pwd = {"username": email, "password": '', "role": role};
var admin_credentials = {username:'admin@smk.dk', password:'farvesnit99'};
var nonadmin_credentials = {username:'kurt@smk.dk', password:'test123'};

/* vocab */
var vocab = {type : 'binders', item : {name: 'bubble gum', secondaryname: 'hubba-bubba', grp:'Glue'}};
var vocab2 = {item : {name: 'chewing gum', secondaryname: 'wrigleys', grp:'Glue'}};

var update_existing_vocab = {type : 'binders', item : {name: 'SuperGlue', secondaryname: 'lim', grp:'Glue'}};
var reset_existing_vocab = {type : 'binders', item : {name: 'glue', secondaryname: 'lim', grp:'Glue'}};
var number_of_vocabs = 26;
var vocab_type = "binders";

/* search */
var search = "&fulltext=" + sample_reference_number +
             "&sampletype=Paint Cross Section&startdate=&enddate=&pageNum=1&pageSize=5";
var smk_artwork = "KMS1";

describe('Server Route Tests', function(){

    describe("POST user ", function() {
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('un-authenticated POST rejected', function(done){
            request(app)
                .post('/user')
                .set('Content-Type', 'application/json')
                .send({})
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('create user attempt with missing password', function(done){
            request(app)
            .post('/user')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(user_no_pwd)
            .end(function(err, res) {
                if (err) { throw err; }
                res.status.should.equal(400);
                done();
            });
        });
        it('create user attempt with empty password', function(done){
            request(app)
            .post('/user')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(user_empty_pwd)
            .end(function(err, res) {
                if (err) { throw err; }
                res.status.should.equal(400);
                done();
            });
        });
        it('create a new user', function(done){
            request(app)
            .post('/user')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(default_credentials)
            .end(function(err, res) {
                if (err) { throw err; }
                res.header['location'].should.include('user/');
                res.status.should.equal(200);
                done();
            });
        });
        it('check the new user exists on the db', function(done){
            db.users.find({"username": email}).toArray(function(err, users) {
                if(err){throw err;}
                users.length.should.equal(1);
                done();
            })
        });
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('login as non admin user',function(done){
            request(app)
              .post('/login')
              .send(default_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('non admin user attempts to change another users password', function(done){
            request(app)
            .post('/user')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(admin_credentials)
            .end(function(err, res) {
                if (err) { throw err; }
                res.status.should.equal(401);
                done();
            });
        });
        it('non admin user changes own password', function(done){
            request(app)
            .post('/user')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(default_credentials)
            .end(function(err, res) {
                if (err) { throw err; }
                res.status.should.equal(200);
                done();
            });
        });
    });
    describe("DELETE user ", function() {
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('un-authenticated DELETE rejected', function(done){
            request(app)
                .delete('/user')
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('delete user attempt with missing query', function(done){
            request(app)
                .delete('/user')
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('delete test user', function(done){
            request(app)
                .delete('/user?username=' + email)
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(200);
                    done();
                });
        });
        it('delete unknown user', function(done){
            request(app)
                .delete('/user?username=' + unknown_email)
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(200); // is successful, even if
                                                    // resource is not found
                    done();
                });
        });
        it('check user has been removed', function(done){
            db.users.find({"username": email}).toArray(function(err, users) {
                if(err){throw err;}
                users.length.should.equal(0);
                done();
            })
        });
    });
    describe("POST sample ", function() {
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('un-authenticated POST rejected', function(done){
            request(app)
                .post('/sample')
                .set('Content-Type', 'application/json')
                .send({})
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('create sample attempt with no body', function(done){
            request(app)
                .post('/sample')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send({}) // missing body here
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('create sample attempt with a bad _id', function(done){
            request(app)
                .post('/sample')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send({"_id" : "this isn't hex" })
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('create test sample', function(done){
            request(app)
            .post('/sample')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(sample)
            .end(function(err, res) {
                if (err) { throw err; }
                res.header['location'].should.equal('sample/' + sample_id);
                res.status.should.equal(201);
                done();
            });
        });
        it('check that sample exists on db', function(done){
            db.samples.find({"referenceNumber": sample_reference_number}).toArray(function(err, samples) {
                if(err){throw err;}
                samples.length.should.equal(1);
                done();
            })
        });
    });
    describe("GET sample", function() {
        it('search for the test sample (accept header, json)',function(done){
            request(app)
              .get('/sample?' + search)
              .set('Accept', 'application/json')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.body[0].referenceNumber.should.equal(sample_reference_number);
                res.status.should.equal(200);
                done();
            });
        });
        it('request the test sample (no accept, returns json)',function(done){
            request(app)
              .get('/sample/' + sample_id)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.header['content-type'].should.equal('application/json; charset=utf-8');
                res.status.should.equal(200);
                done();
            });
        });
        it('generate a report for the test sample (.xlsx)',function(done){
            request(app)
              .get('/sample?' + search)
              .set('Accept', 'application/vnd.openxmlformats')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
             // res.body[0].referenceNumber.should.equal(sample_reference_number);
                res.status.should.equal(200);
                done();
            });
        });
        it('request the test sample with no supported media type',function(done){
            request(app)
              .get('/sample?' + search)
              .set('Accept', 'text/*;q=0.3, text/html;q=0.7, text/html;level=1,text/html;level=2;q=0.4')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.status.should.equal(406);
                done();
            });
        });
        it('request the test sample with no media type (returns json)',function(done){
            request(app)
              .get('/sample?' + search)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.header['content-type'].should.equal('application/json; charset=utf-8');
                res.status.should.equal(200);
                done();
            });
        });
        it('request the test sample with complex, supported and unsupported media types (returns json)',function(done){
            request(app)
              .get('/sample?' + search)
              .set('Accept', 'text/*;q=0.3, text/html;q=0.7, text/html;level=1,text/html;level=2;q=0.4, */*;q=0.5')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.header['content-type'].should.equal('application/json; charset=utf-8');
                res.status.should.equal(200);
                done();
            });
        });
    });
    describe("GET search size ", function() {
        it('read the number of items in the search result',function(done){
            request(app)
              .get('/sample?count=true' + search)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                  res.text.should.equal('1');
                  res.status.should.equal(200);
                done();
            });
        });
    });
    describe("DELETE sample ", function() {
        it('login as nonadmin user',function(done){
            request(app)
                .post('/login')
                .send(nonadmin_credentials)
                .end(function(err,res){
                    res.status.should.equal(200);
                    cookie = res.headers['set-cookie'];
                    done();
                });
        });
        it('nonadmin DELETE rejected', function(done){
            request(app)
                .delete('/sample/' + unknown_sample_id)
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401); //
                    done();
                });
        });
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });

        it('un-authenticated DELETE rejected', function(done){
            request(app)
                .delete('/sample/' + sample_id)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('delete attempt on unknown sample', function(done){
            request(app)
                .delete('/sample/' + unknown_sample_id)
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(200); // is successful, even if resource is not found
                    done();
                });
        });
        it('delete sample attempt with missing id', function(done){
            request(app)
                .delete('/sample/')
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(404);
                    done();
                });
        });
        it('delete sample attempt with bad _id', function(done){
            request(app)
                .delete('/sample/' + "eeerrghhhh!")
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('delete test sample', function(done){
            request(app)
                .delete('/sample/' + sample_id)
                .set('cookie', cookie)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(200);
                    done();
                });
        });
        it('check sample is removed', function(done){
            db.samples.find({"referenceNumber": sample_reference_number}).toArray(function(err, samples) {
                if(err){throw err;}
                samples.length.should.equal(0);
                done();
            })
        });
    });
    describe("POST artwork ", function() {
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('un-authenticated POST rejected', function(done){
            request(app)
                .post('/artwork')
                .set('Content-Type', 'application/json')
                .send({})
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('create artwork attempt with no body', function(done){
            request(app)
                .post('/artwork')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send({}) // missing body here
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('create artwork attempt with a bad _id', function(done){
            request(app)
                .post('/artwork')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send({"_id" : "this isn't hex" })
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
        it('create a test artwork', function(done){
            request(app)
            .post('/artwork')
            .set('Content-Type', 'application/json')
            .set('cookie', cookie)
            .send(artwork)
            .end(function(err, res) {
                if (err) { throw err; }
                res.header['location'].should.include('artwork/');
                res.status.should.equal(200);
                done();
            });
        });
        it('check that artwork exists on db', function(done){
            db.artworks.find({"inventoryNum": inventory_number}).toArray(function(err, artworks) {
                if(err){throw err;}
                artworks.length.should.equal(1);
                done();
            })
        });
    });
    describe("GET artwork ", function() {
        it('retrieve the test artwork by _id',function(done){
            request(app)
              .get('/artwork/' + artwork_id)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.body[0].inventoryNum.should.equal(inventory_number);
                res.status.should.equal(200);
                done();
            });
        });
        it('retrieve the test artwork by inventory number',function(done){
            request(app)
              .get('/artwork?invNum=' + inventory_number)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.body[0].inventoryNum.should.equal(inventory_number);
                res.status.should.equal(200);
                done();
            });
        });
        it('remove the test artwork from db (cleanup)', function(done){
            db.artworks.remove({"inventoryNum": inventory_number}, function(err, numberRemoved){
                if(err){throw err;}
                numberRemoved.n.should.equal(1);
                done();
            });
        });
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
    });
    describe("POST vocab ", function() {
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
        it('un-authenticated POST rejected', function(done){
            request(app)
                .post('/vocab/' + vocab_type  + '/items')
                .set('Content-Type', 'application/json')
                .send({})
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(401);
                    done();
                });
        });
        it('login as admin user',function(done){
            request(app)
              .post('/login')
              .send(admin_credentials)
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = res.headers['set-cookie'];
                done();
            });
        });
        it('create vocab attempt with no body', function(done){
            request(app)
                .post('/vocab/' + vocab_type  + '/items')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send({}) // missing body here
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.status.should.equal(400);
                    done();
                });
        });
//        it('create a new vocab', function(done){
//            request(app)
//                .post('/vocab')
//                .set('Content-Type', 'application/json')
//                .set('cookie', cookie)
//                .send(vocab)
//                .end(function(err, res) {
//                    if (err) { throw err; }
//                    res.header['location'].should.equal('vocab/' + vocab_type);
//                    res.status.should.equal(200);
//                    done();
//                });
//        });
        it('create a new vocab', function(done){
            request(app)
                .post('/vocab/' + vocab_type  + '/items')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send(vocab)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.header['location'].should.equal('vocab/' + vocab_type);
                    res.status.should.equal(200);
                    done();
                });
        });
        it('remove the new vocab from db (cleanup)', function(done){
      // db.vocabs.update( {$and:[{ "items.name" : "emulsion" },{type:
        // "binders"}]} , { $pull: { "items": {name: "emulsion"} } } )
            var query = {$and:[{type: "binders"}, { "items.name" : "bubble gum" }]};
            var update = {$pull: {items:{name : "bubble gum"}}};
            var options = {};
            db.vocabs.update(query, update, options, function (err, updated) {
                if(err){throw err;}
                updated.ok.should.equal(true);
                updated.n.should.equal(1);
                done();
            });
        });
        it('update an existing vocab', function(done){
            request(app)
                .post('/vocab/' + vocab_type  + '/items')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send(update_existing_vocab)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.header['location'].should.equal('vocab/' + vocab_type);
                    res.status.should.equal(200);
                    done();
                });
        });
        it('reset the existing vocab to previous value', function(done){
            request(app)
                .post('/vocab/' + vocab_type  + '/items')
                .set('Content-Type', 'application/json')
                .set('cookie', cookie)
                .send(update_existing_vocab)
                .end(function(err, res) {
                    if (err) { throw err; }
                    res.header['location'].should.equal('vocab/' + vocab_type);
                    res.status.should.equal(200);
                    done();
                });
        });
    });
    describe("GET vocab ", function() {
        it('retrieve all vocabs',function(done){
            request(app)
              .get('/vocab')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.body.length.should.equal(number_of_vocabs);
                res.status.should.equal(200);
                done();
            });
        });
        it('retrieve one vocab',function(done){
            request(app)
              .get('/vocab/' + vocab_type)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.body[0].type.should.equal(vocab_type);
                res.status.should.equal(200);
                done();
            });
        });
        it('logout',function(done){
            request(app)
              .post('/logout')
              .set('cookie', cookie)
              .send({})
              .end(function(err,res){
                res.status.should.equal(200);
                cookie = '';
                done();
            });
        });
    });
    describe("GET searchsmk", function() {
        it('search SMK for artworks',function(done){
            this.timeout(10000); /* smk's solr can be veerrry slow */
            request(app)
              .get('/searchsmk?id=' + smk_artwork)
              .send()
              .end(function(err,res){
                var resp = JSON.parse(res.text);
                resp.response.docs[0].id.should.equal(smk_artwork);
                res.status.should.equal(200);
                done();
            });
        });
    });
    describe("OPTIONS", function() {
        it('request options for users (test CORS)',function(done){
            request(app)
              .options('/user')
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.header['access-control-allow-methods'].should.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
                res.header['access-control-allow-origin'].should.equal('*');
                res.status.should.equal(204);
                done();
            });
        });
        it('request options for samples (test CORS)',function(done){
            request(app)
              .options('/sample/'+ unknown_sample_id)
              .set('cookie', cookie)
              .send()
              .end(function(err,res){
                res.header['access-control-allow-methods'].should.equal('GET,HEAD,PUT,PATCH,POST,DELETE');
                res.header['access-control-allow-origin'].should.equal('*');
                res.status.should.equal(204);
                done();
            });
        });
    });
});

