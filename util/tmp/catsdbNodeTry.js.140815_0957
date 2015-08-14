#!/usr/bin/env node

var convToCats = require('./conv.js');
var fs = require('fs');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var args = require('minimist')(process.argv.slice(2),{ string: "file" });
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
var filename = process.argv[2];
var type = process.argv[3];
console.log(filename);
var tmpbufObj = JSON.parse(fs.readFileSync(filename, "utf8"));
var bufObj = {};

if (type == 'fromS')
  bufObj = convToCats.fromSolrToCATS(tmpbufObj);
else
  bufObj = tmpbufObj;


MongoClient.connect('mongodb://127.0.0.1:27017/cats', function (err, db) {
  if (err) {
    console.log(err);
  }
  assert.equal(null, err);
  //findDoc(db, function(result) {
  //findDoc(db, bufObj, function() {
  //upsertDoc(db, bufObj, function() {
  updateDocument(db, bufObj, function() {
    console.log("go fo ..");
    console.log("done");
    db.close();
  });
});

var findDoc = function(db, aw, callback) {
  var selector = {};
  selector['inventoryNum'] = aw.inventoryNum;
  //selector['inventoryNum'] = 'KMSsp587';
  var cursor = db.collection('artworks').find(selector);
  cursor.each(function(err, doc) {
    assert.equal(err,null);
    if (doc != null) {
      console.log("got");
      console.dir(doc);
    } else {
      callback();
    }
  });
};


var updateDocument = function(db, aw, callback) {
  var selector = {};
  var updator = aw;
  console.log(aw.inventoryNum);
  console.log(JSON.stringify(aw));
  selector['inventoryNum'] = aw.inventoryNum;
  console.log("update .."  + aw.inventoryNum);
  //db.collection('artworks').update(selector,{$set: updator}), function(err, result) {
  db.collection('artworks').update(selector,{ $set: aw}, function(err, result) {
    console.log("ddd");
    console.log(result);
    callback();
  });
};


var upsertDoc = function(db, aw, callback) {
   db.collection('artworks').insertOne(aw, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the restaurants collection.");
    callback(result);
  });
};
