var express = require('express');
var MongoClient = require('mongodb').MongoClient;
/*
{
  "_id" : ObjectId("534413cad4c2e9c507a64f38"),
  "Day" : 1,
  "Time" : 54,
  "State" : "Vermont",
  "Airport" : "BTV",
  "Temperature" : 39,
  "Humidity" : 57,
  "Wind Speed" : 6,
  "Wind Direction" : 170,
  "Station Pressure" : 29.6,
  "Sea Level Pressure" : 150
}
*/
// db.data.find( { $and: [ {"Wind Direction": { $lt :270 }},{ "Wind Direction": { $gt:180 }} ]}, { "Wind Direction":1,"Temperature":1, State:1 }).sort({Temperature:1})
MongoClient.connect('mongodb://localhost:27017/weather',function(err,db) {
  if (err) throw err;
  //var selector = { 'referenceNumber': { $regex : "Kon" }, {'artwork': { $exists: true }}};
  var projector = { 'State': 1, 'Temperature':1};
  var updator = { 'State': 1, 'Temperature':1};

  var states = db.collection('data');
  var cursor = states.find({},projector);
  var counter = 0;
  var tmpState = "";
  var tmpTemp = "";
  //cursor.sort([['State', 1], ['Temperature', 1]]);
  cursor.sort({'State': 1, 'Temperature': -1});
  //cursor.sort(['state', 1]);
  //cursor.sort(['Temperature', -1]);
  cursor.each(function(err,doc) {
    counter++;
    console.log("into" + doc['State'] + " with " + counter);
    if (counter == 1) {
      selector = {'_id':doc['_id']};
      operator = {'$set': { 'month_high':true}};
      states.update(selector, operator, function(err, upd) {
        if(err) throw err;
        console.dir("upd: " + upd);
      });
      tmpState = doc['State'];
      tmpTemp = doc['Temperature'];
    }
    if (tmpState == doc['State']) {
      console.log("next .." + doc['State']) ;
    } else {
      selector = {'_id':doc['_id']};
      operator = {'$set': { 'month_high':true}};
      console.log("TO DO");
      console.log(selector);
      console.log(operator);
      states.update(selector, operator, function(err, upd) {
        if(err) throw err;
        console.dir("upd: " + upd);
      });
      tmpState = doc['State'];
      tmpTemp = doc['Temperature'];
    }
  });
});
