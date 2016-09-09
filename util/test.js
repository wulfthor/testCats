var express = require('express');
var MongoClient = require('mongodb').MongoClient;
// db.data.find( { $and: [ {"Wind Direction": { $lt :270 }},{ "Wind Direction": { $gt:180 }} ]}, { "Wind Direction":1,"Temperature":1, State:1 }).sort({Temperature:1})
MongoClient.connect('mongodb://localhost:27017/weather',function(err,db) {
  if (err) throw err;
  //var selector = { 'referenceNumber': { $regex : "Kon" }, {'artwork': { $exists: true }}};
  var selector = { 'artwork': { $exists: 1 }};
  var projector = { 'referenceNumber': 1, _id:0, 'artwork':1};
//var selector = { 'referenceNumber': 'Kons-1'};

  db.collection('samples').findOne(selector, function(err, doc) {
    if (err) throw err;
    //console.log(doc) 
  });
  db.collection('samples').find(selector, projector).toArray(function(err, docs) {
    if(err) throw err;
    docs.forEach(function(doc){
      //console.dir("GOT: " + doc);
      console.dir("GOT: " + JSON.stringify(doc));
    });
    console.dir("ok");
    db.close();
  }); 
  /*
  var cursor = db.collection('samples').find(selector);
  cursor.each(function(err,doc) {
    if(err) throw err;
    if(doc == null) {
      return db.close()
    } else {
      console.dir(doc.referenceNumber);
    }
  });
 */
}); 
