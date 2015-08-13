var http = require('http');
var Q = require('q');

exports.smkSearch = function(csid) {
    var deferred = Q.defer();
    var id = csid;
    var options = {
        host: 'localhost',           //'csdev-seb',
        port: 8983,                    // 8180,
        path: '/solr/prod_CATS/' +     //'/solr-example/dev_cats/
        'select?q=csid%3A' + id + '&wt=json&indent=true', /*id_s also works on verso & multiworks*/
        method: 'GET'
    };
    cb = function (response) {
        var str = '';
        response.on('data', function (chunk) {
            str += chunk;
        });
        response.on('end', function () {
            //console.log(str);
            deferred.resolve(str);
        });

    };
    http.request(options, cb).end();
    return deferred.promise;
};

exports.keysToCats = function(doc) {
    var artwork = {};
    artwork.corpusId = doc.csid;
    artwork.externalurl = doc.externalurl;
    artwork.inventoryNum = doc.id;
    artwork.title = doc.title_first;
    var earliest = new Date(doc.object_production_date_earliest);

    artwork.productionDateEarliest = (doc.object_production_date_earliest) ?
        doc.object_production_date_earliest.substring(0,10) : ""; /*date only*/
    artwork.productionDateLatest = (doc.object_production_date_latest) ?
        doc.object_production_date_latest.substring(0,10) : "";
    artwork.artist = doc.artists_data.replace(/;-;/g,', ');
    artwork.dimensions = doc.dimension_netto;
    artwork.nationality = doc.artists_natio.replace(/;-;/g,', ');
    artwork.technique = doc.prod_technique;
    artwork.owner = doc.owner;
    return artwork;
};


