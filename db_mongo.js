/**
 * Mongo database for caching corpus responses
 */

var databaseUrl = "cats";
var collections = ["samples", "artworks", "users", "vocabs"];
var db = require("./node_modules/mongojs").connect(databaseUrl, collections);
var logger = require("./logging");

/* Create a text index on all samples to enable
 * mongos full text search capability
 */
db.samples.ensureIndex(
        { "$**": "text" },
        { name: "TextIndex" }
);

/* Add a unique constraint to the vocabs and users, so we will only insert the
 * default data (at startup) if they don't already exist
 */
db.vocabs.ensureIndex(
        { "type": 1 },
        { unique: true }
);

db.users.ensureIndex(
        { "username": 1 },
        { unique: true }
);

/* Copy over the default vocabs to catsdb upon startup (if they are not present)
 */
var v = require('./vocabs');
var defaults = v.defaultVocabs();

for (var i=0; i < defaults.length; i++){
    db.vocabs.insert(defaults[i], function(err, doc) {
        if (err || !doc){
            /*if the error is 'duplicate' - it just means the vocab is already initialised*/
            if(err && err.code != 11000) {/*11000 == mongo duplicate key error : don't log this*/
                logger.error("Default vocab not added : " + err);
            }
        } else {
            logger.info(doc.type + " default vocabs inserted successfully");
        }
    });
}

/* Setup a default user on startup (if not present). Password is "admin" and should be changed upon first use.
 */
var default_admin = {username: 'admin@smk.dk', password : '$2a$10$j4GD2P.isxPBgMCcEiFrPOBbRl4uTpeG.qQKe.trtnNj1M1yrF.te', role : 'admin'};

db.users.insert(default_admin, function(err, doc) {
    if (err || !doc){
        if(err && err.code != 11000) {
            logger.error("Default admin not added : " + err);
        }
    } else {
        logger.info(doc.type + " default admin inserted successfully");
    }
});

//Public API
module.exports = db;