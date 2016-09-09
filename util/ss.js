var MongoClient = require('mongodb').MongoClient;
var request = require('request');

MongoClient.connect('mongodb://localhost:27017/cats',function(err,db) {
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
