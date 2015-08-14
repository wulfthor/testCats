#!/usr/bin/env node

var fs = require('fs');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
//var db = MongoClient.connect('mongodb://127.0.0.1:27017/cats', function (err, db) {
/*
{
	"_id" : ObjectId("54b65ee5e4b0c32fdac90250"),
	"nationality" : "Dutch",
	"inventoryNum" : "KMSsp587",
	"externalurl" : "http://cspic.smk.dk/globus/xspjnpwd/img0027.jpg",
	"productionDateEarliest" : "1671-01-01",
	"artist" : "Jan Steen",
	"title" : "David hyldes efter sejren over Goliat og filistrene",
	"corpusId" : "7cf3a4d5-95e2-4499-a412-edac64c7d65c",
	"dimensions" : "106.9 x 159.2 cm",
	"technique" : "Oil on canvas",
	"productionDateLatest" : "1671-12-31"
}
*/
var filename = "change.json"
var bufObj = JSON.parse(fs.readFileSync(filename, "utf8"));

MongoClient.connect('mongodb://127.0.0.1:27017/test', function (err, db) {
  if (err) {
    console.log(err);
  }
  assert.equal(null, err);
  insertDocument(db, id, function() {
      db.close();
  });
});


var updateDocument = function(db, aw, callback) {
  var selector = {};
  var updator = {};
  selector['inventoryNum'] = id;
  updator['inventoryNum'] = id;
   db.collection('artwork').update( {
      "address" : {
         "street" : "2 Avenue",
         "zipcode" : "10075",
         "building" : "1480",
         "coord" : [ -73.9557413, 40.7720266 ],
      },
      "borough" : "Manhattan",
      "cuisine" : "Italian",
      "grades" : [
         {
            "date" : new Date("2014-10-01T00:00:00Z"),
            "grade" : "A",
            "score" : 11
         },
         {
            "date" : new Date("2014-01-16T00:00:00Z"),
            "grade" : "B",
            "score" : 17
         }
      ],
      "name" : "Vella",
      "restaurant_id" : "41704620"
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the restaurants collection.");
    callback(result);
  });
};


var insertDocument = function(db, callback) {
   db.collection('restaurants').insertOne( {
      "address" : {
         "street" : "2 Avenue",
         "zipcode" : "10075",
         "building" : "1480",
         "coord" : [ -73.9557413, 40.7720266 ],
      },
      "borough" : "Manhattan",
      "cuisine" : "Italian",
      "grades" : [
         {
            "date" : new Date("2014-10-01T00:00:00Z"),
            "grade" : "A",
            "score" : 11
         },
         {
            "date" : new Date("2014-01-16T00:00:00Z"),
            "grade" : "B",
            "score" : 17
         }
      ],
      "name" : "Vella",
      "restaurant_id" : "41704620"
   }, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the restaurants collection.");
    callback(result);
  });
};
