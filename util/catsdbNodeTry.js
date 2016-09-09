#!/usr/bin/env node

var convToCats = require('./conv.js');
var fs = require('fs');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var format = require('util').format;
var args = require('minimist')(process.argv.slice(2),{ string: "file" });

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
  //assert.equal(null, err);
  if (type == 'del'){
    removeDoc(db, bufObj, function() {
      //upsertDoc(db, bufObj, function() {
      console.log("done");
      db.close();
    });
  }
  if (type == 'udp'){
      updateDocument(db, bufObj, function() {
      console.log("done");
      db.close();
      });
    }
  if (type == 'ins'){
      upsertDoc(db, bufObj, function() {
      console.log("done");
      db.close();
      });
    }
  if (type == 'find'){
      findDoc(db, bufObj, function() {
        console.log("done");
        db.close();
        });
    }
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

var removeDoc = function(db, aw, callback) {
  var selector = {};
  selector['inventoryNum'] = aw.inventoryNum;
  db.collection('artworks').remove(selector, { justOne: 1 },function(err, result) {
    if (err) {
      console.log("error removing " + err);
    } else {
      console.log("removing " + result);
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
    console.log(result);
    callback();
  });
};


var upsertDoc = function(db, aw, callback) {
  db.collection('artworks').insertOne(aw, function(err, result) {
    assert.equal(err, null);
    console.log("Inserted a document into the restaurants collection.");
    console.log(result);
    callback();
  });
};
