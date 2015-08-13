exports.fromSolrToCATS = function(doc) {
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
