#!/usr/bin/env node

var fs = require('fs');
var format = require('util').format;
var args = require('/usr/local/lib/node_modules/minimist')(process.argv.slice(2));
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;


function logArrayElements(element, index, array) {
  console.log('a['+index+']='+element);
}

var db = MongoClient.connect('mongodb://127.0.0.1:27017/cats', function (err, db) {
    if(err){
      console.log("err " + err);
    } else {
      var adminDb = db.admin();
      console.log("got conn");
      adminDb.listDatabases(function(err,dbs) {
        //dbs.forEach(logArrayElements);
        if(err) {
         console.log("err: " + err);
        } else { 
        console.log(dbs.length);
        }
      });
      var collection = db.collection('artworks');
      console.log(collection.findOne());
    }
  db.close();
    });

