/**********************
 * Module dependencies
 **********************/

var express = require('express'),
    cors = require('cors'),
    fs = require('fs'),
    diff = require('deep-diff').diff,
    logger = require("./logging"),
    nodeExcel = require('excel-export'),
    routes = require('./routes'),
    api = require('./routes/api'),
    http = require('http'),
    https = require('https'),
    path = require('path'),
    db = require("./db_mongo"),
    Q = require('q'),
    bcrypt = require('bcrypt-nodejs'),
    SALT_WORK_FACTOR = 10,
    passport = require('passport'),
    negotiator = require('negotiator'),
    gm = require('gm'),
    smkRoutes = require('./routes/smkRoutes'),
    config = require('./config');

var app = module.exports = express();
var MongoStore = require('connect-mongo')(express);

/****************
 * Configuration
 ****************/

/*set port to whatever is in the environment variable PORT, or 3000 if there's nothing there.*/
//app.set('port', process.env.PORT || 3443);

if (app.get('env') === 'development') {
    app.set('views', __dirname + '/views');
    app.use(express.errorHandler());
}
/* production only */
if (app.get('env') === 'production') {
    app.set('views', __dirname + '/dist/views');
    app.use('/dist', express.static(__dirname + '/dist'));

}
app.set('view engine', 'jade');

logger.debug("Overriding 'Express' logger");
app.use(express.logger({format: 'dev', stream: logger.stream}));

/* BodyParser is bundled In Express 3, so no 'require' needed
 * BodyParser allows Express to handle JSON, URLEncoded and multipart bodies in requests.
 * However, we'll define them separately, because we want to set a limit
 * for multiparts only (default limits are 1mb for json and urlencoded and we don't want to
 * increase these).
 *
 * These apply to incoming bodies on all routes.
 * */
//app.use(express.bodyParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(express.multipart({
    keepExtensions: true,
    limit: 1024 * 1024 * 20, /*upload file size limit*/
    defer: true                 /*don't stream to temp files*/
}));

app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));
app.use('/bower_components', express.static(__dirname + '/bower_components'));
app.use('/public', express.static(__dirname + '/public'));

/*Passport middleware : must be before 'router'*/
app.use(express.cookieParser());

/*Use connect-mongo to persist sessions to db instead of RAM*/
app.use(express.session({
    secret: 'rory gallagher',
    store: new MongoStore({
        db: 'cats'
    })
}));

app.use(passport.initialize());
app.use(passport.session());
/*End Passport middleware*/

app.use(app.router);
app.use(cors());


/**************************
 * Passport authentication
 **************************/

var LocalStrategy = require('passport-local').Strategy;

/**
 * Bcrypt middleware : return hashed password
 */
function encrypt(password, next) {

    /*if(!user.isModified('password')) return next();*/

    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
        if (err) return next(err);

        bcrypt.hash(password, salt, null, function (err, hash) {
            if (err) return next(err, null);
            password = hash;
            return next(null, password);
        });
    });
};

function findById(id, fn) {

    var _id = db.ObjectId(id);

    db.users.find({"_id": _id}).toArray(function (err, users) {
        if (err || !users) {
            return fn(err, null);
        }
        if (users) {
            return fn(null, users[0]);
        }
    });
}

function findByUsername(username, fn) {

    db.users.find({"username": username}).toArray(function (err, users) {
        if (err || !users) {
            return fn(err, null);
        }
        if (users) {
            return fn(null, users[0]);
        }
    });
}

/*Passport strategy (local) Used when authenticating*/
passport.use(new LocalStrategy(function (username, password, done) {

    /* Find the user by username.  If there is no user with the given username
     or the password is not correct then return an error, otherwise, return the
     authenticated user*/
    findByUsername(username, function (err, user) {
        if (err) {
            return done(err);
        }
        if (!user) {
            return done(null, false, {message: 'Unknown user ' + username});
        }

        /* compare password with the hash */
        bcrypt.compare(password, user.password, function (err, isMatch) {
            if (err || !isMatch)  return done(null, false, {message: 'Incorrect password.'});
            return done(null, user);
        });
    })
}));

/*Passport sessions*/
passport.serializeUser(function (user, done) {
    done(null, user._id);
});

passport.deserializeUser(function (id, done) {
    findById(id, function (err, user) {
        done(err, user);
    });
});

/*Passport authentication Routes*/

/* login :
 * Returns: user, or null if authentication failed
 */
app.post('/login', passport.authenticate('local'), function (req, res) {
    logger.info('user ' + req.user.username.toString() + ' logged in');
    res.status(200).send(req.user);
});

/* logout */
app.post('/logout', function (req, res) {
    if (req.isAuthenticated()) {
        logger.info('user ' + req.user.username.toString() + ' logging out');
        req.logOut();
    } else {
        logger.info('logout request, but user not logged in');
    }
    res.send(200);
});

/* route to test if the user is logged in or not */
app.get('/loggedin', function (req, res) {
    res.status(200).send(req.isAuthenticated() ? req.user : '0');
});


/********************
 * Helper functions
 ********************/

/**
 * buildSampleQuery
 *
 * Builds this mongo query used for searching samples:
 *
 * ({$and:[{$or: [{"productionDate" : {$lte: endDate}}, {"artwork.productionDateEarliest" : {$lte: endDate}}]},
 *         {$or: [{"productionDate" : {$gte: startDate}}, {"artwork.productionDateLatest" : {$gte: startDate}}]},
 *         {"sampleType.name": sampletype},
 *         {"$text": {"$search": fulltext}
 *        }]
 * })
 *
 * Usage: accepts a request url containing any combination of these 4 queries:
 *        ?fulltext=search string&sampletype=Paint Cross Section&startdate=1850&enddate=1900
 */
function buildSampleQuery(req) {

    var query = {};
    var filters = [];
    var fullText = req.query.fulltext;
    var sampleType = req.query.sampletype;

    /* date query requires ISO strings
     * remove time as artwork date times are not relevant and can break the application
     */
    var startDate = (req.query.startdate) ? new Date(req.query.startdate).toISOString().replace(/T.*Z/, '') : null;
    var endDate = (req.query.enddate) ? new Date(req.query.enddate).toISOString().replace(/T.*Z/, '') : null;

    if (fullText) {
        filters.push({"$text": {"$search": fullText}});
    }
    if (sampleType) {
        filters.push({"sampleType.name": sampleType});
    }

    /* searches by date should use the related artwork date, except for pigments
     * which have their own production dates (named productionDate)
     */
    if (endDate) {
        filters.push({$or: [{"productionDate": {$lte: endDate}}, {"artwork.productionDateEarliest": {$lte: endDate}}]});
    }
    if (startDate) {
        filters.push({$or: [{"productionDate": {$gte: startDate}}, {"artwork.productionDateLatest": {$gte: startDate}}]});
    }
    /*apply AND operation to any filters*/
    if (filters.length) {
        query.$and = filters;
    }
    return query;
}

/**
 *  Excel export (requires 'excel-export' module)
 */
function buildSampleExcel(query) {

    var result = null;

    /* use Q.defer() to create a deferred. Deferred is used to
     * implement custom methods returning promises. We need to make a
     * promise as the database query is asynch and this function may return
     * before it completes. The calling function can use .then() to handle the
     * completed promise*/
    var deferred = Q.defer();

    db.samples.find(query)
        .sort('referenceNumber')
        .toArray(function (err, items) {

            if (err || !items) {
                logger.error(err);

            } else if (items) {
                /*build excel sheet*/
                var body = items;
                var conf = {};
                conf.cols = [
                    {
                        caption: 'Sample Type',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Ref.num',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Sample origin',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Sample date',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Institution',
                        type: 'string',
                        width: 30
                    }, {
                        caption: 'Employee',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Sample location',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Remarks',
                        type: 'string',
                        width: 30
                    }, {
                        caption: 'Fibre type(s)',
                        type: 'string',
                        width: 30
                    }, {
                        caption: 'Fibre glue',
                        type: 'string',
                        width: 30
                    }, {
                        caption: '(Fibre) Ligin',
                        type: 'string',
                        width: 10
                    }, {
                        caption: '(Fibre) Alum',
                        type: 'string',
                        width: 10
                    }, {
                        caption: '(Fibre) Filler',
                        type: 'string',
                        width: 10
                    }, {
                        caption: 'Material type(s)',
                        type: 'string',
                        width: 30
                    }, {
                        caption: '(Paint) Priming',
                        type: 'string',
                        width: 15
                    }, {
                        caption: 'Paint layers description',
                        type: 'string',
                        width: 30
                    }, {
                        caption: 'Paint layers',
                        type: 'string',
                        width: 30
                    }, {
                        caption: '(Pigment) Colour Classification',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Source',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Production no./Batch no.',
                        type: 'string',
                        width: 30
                    }, {
                        caption: '(Pigment) Secondary provenance',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Place of origin',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Chemical composition',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Pigment name',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Other names',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Form',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Production date',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Pigment) Container',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Stretcher type',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Material type',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Condition',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Joint technique',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Dimensions',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Production earliest',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Production date latest',
                        type: 'string',
                        width: 20
                    }, {
                        caption: '(Stretcher) Source',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Sample Analysis',
                        type: 'string',
                        width: 30
                    }, {
                        caption: 'Artwork Inventory Num.',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork Title',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artist',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artist nationality',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork Technique',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork production date earliest',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork production date latest',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork dimensions',
                        type: 'string',
                        width: 20
                    }, {
                        caption: 'Artwork owner',
                        type: 'string',
                        width: 20
                    }];

                conf.rows = [];
                for (i = 0; i < body.length; i++) {
                    var ii = 0;
                    /*shared fields */
                    conf.rows[i] = [];
                    conf.rows[i][ii++] = body[i].sampleType.name;
                    conf.rows[i][ii++] = (body[i].referenceNumber) ? body[i].referenceNumber : null;
                    conf.rows[i][ii++] = (body[i].originLocation) ? body[i].originLocation : null;
                    conf.rows[i][ii++] = (body[i].sampleDate) ? body[i].sampleDate : null;
                    conf.rows[i][ii++] = (body[i].owner && body[i].owner.name) ? body[i].owner.name : null;
                    conf.rows[i][ii++] = (body[i].employee) ? body[i].employee : null;
                    conf.rows[i][ii++] = (body[i].sampleLocation) ? body[i].sampleLocation : null;
                    conf.rows[i][ii++] = (body[i].remarks) ? body[i].remarks : null;

                    /*paper fields*/
                    conf.rows[i][ii++] = (body[i].fibreType) ? body[i].fibreType.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;
                    conf.rows[i][ii++] = (body[i].fibreGlue) ? body[i].fibreGlue.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;
                    conf.rows[i][ii++] = (body[i].fibreLigin) ? true : null;
                    conf.rows[i][ii++] = (body[i].fibreAlum) ? true : null;
                    conf.rows[i][ii++] = (body[i].fibreFiller) ? true : null;

                    /*material fields*/
                    conf.rows[i][ii++] = (body[i].materialType) ? body[i].materialType.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;

                    /*paint fields*/
                    conf.rows[i][ii++] = (body[i].paintPriming) ? true : null;
                    conf.rows[i][ii++] = (body[i].paintLayerDescription) ? body[i].paintLayerDescription : null;
                    conf.rows[i][ii++] = (body[i].paintLayer && body[i].paintLayer[0].layerType.name) ?
                        body[i].paintLayer.map(function (elem) {
                            /*format all layer data for a single cell*/
                            var layer = "";
                            var binders = (elem.paintBinder) ? elem.paintBinder.map(function (elem) {
                                return elem.name;
                            }).join(", ") : "";
                            var colours = (elem.colour) ? elem.colour.map(function (elem) {
                                return elem.name;
                            }).join(", ") : "";
                            var pigments = (elem.pigment) ? elem.pigment.map(function (elem) {
                                return elem.name;
                            }).join(", ") : "";
                            var dyes = (elem.dye) ? elem.dye.map(function (elem) {
                                return elem.name;
                            }).join(", ") : "";

                            layer = elem.layerType.name + " layer" +
                                "\n  Binders: " + binders +
                                "\n  Colours: " + colours +
                                "\n  Pigments: " + pigments +
                                "\n  Dyes: " + dyes;

                            return layer;
                        }).join("\n\n") : null;

                    /*pigment fields*/
                    conf.rows[i][ii++] = (body[i].pigmentColourClass && body[i].pigmentColourClass.name) ? body[i].pigmentColourClass.name : null;
                    conf.rows[i][ii++] = (body[i].pigmentSource) ? body[i].pigmentSource : null;
                    conf.rows[i][ii++] = (body[i].pigmentProdNumber) ? body[i].pigmentProdNumber : null;
                    conf.rows[i][ii++] = (body[i].pigmentSecondryProvenance) ? body[i].pigmentSecondryProvenance : null;
                    conf.rows[i][ii++] = (body[i].pigmentOrigin) ? body[i].pigmentOrigin : null;
                    conf.rows[i][ii++] = (body[i].pigmentComposition) ? body[i].pigmentComposition : null;
                    conf.rows[i][ii++] = (body[i].pigmentName && body[i].pigmentName.name) ? body[i].pigmentName.name : null;
                    conf.rows[i][ii++] = (body[i].pigmentOtherName) ? body[i].pigmentOtherName : null;
                    conf.rows[i][ii++] = (body[i].pigmentForm && body[i].pigmentForm.name) ? body[i].pigmentForm.name : null;
                    conf.rows[i][ii++] = (body[i].productionDate) ? body[i].productionDate : null;
                    conf.rows[i][ii++] = (body[i].pigmentContainer && body[i].pigmentContainer.name) ? body[i].pigmentContainer.name : null;

                    /*stretcher fields*/
                    conf.rows[i][ii++] = (body[i].stretcherType) ? body[i].stretcherType.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;
                    conf.rows[i][ii++] = (body[i].stretcherMaterialType) ? body[i].stretcherMaterialType.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;
                    conf.rows[i][ii++] = (body[i].stretcherCondition && body[i].stretcherCondition.name) ? body[i].stretcherCondition.name : null;
                    conf.rows[i][ii++] = (body[i].stretcherJointTechnique) ? body[i].stretcherJointTechnique.map(function (elem) {
                        return elem.name;
                    }).join(", ") : null;
                    conf.rows[i][ii++] = (body[i].stretcherDimensions) ? body[i].stretcherDimensions : null;
                    conf.rows[i][ii++] = (body[i].stretcherProductionDateEarliest) ? body[i].stretcherProductionDateEarliest : null;
                    conf.rows[i][ii++] = (body[i].stretcherProductionDateLatest) ? body[i].stretcherProductionDateLatest : null;
                    conf.rows[i][ii++] = (body[i].stretcherSource) ? body[i].stretcherSource : null;

                    /*analysis field*/

                    conf.rows[i][ii++] = (body[i].sampleAnalysis && body[i].sampleAnalysis[0].type) ? body[i].sampleAnalysis.map(function (elem) {
                        console.log("got" + JSON.stringify(body[i]));
                        console.log("try" + JSON.stringify(elem.type));
                        console.log("try" + JSON.stringify(elem));
                        return elem.type.name;
                    }).join(", ") : null;

                    /*artwork fields*/
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.inventoryNum) ? body[i].artwork.inventoryNum : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.title) ? body[i].artwork.title : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.artist) ? body[i].artwork.artist : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.nationality) ? body[i].artwork.nationality : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.technique) ? body[i].artwork.technique : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.productionDateEarliest) ? body[i].artwork.productionDateEarliest : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.productionDateLatest) ? body[i].artwork.productionDateLatest : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.dimensions) ? body[i].artwork.dimensions : null;
                    conf.rows[i][ii++] = (body[i].artwork && body[i].artwork.owner) ? body[i].artwork.owner : null;
                }
                result = nodeExcel.execute(conf);
            }
            /* Calling resolve with a non-promise value causes promise to be
             * fulfilled with that value */
            deferred.resolve(result);
        });
    /* return the promises to be resolved later */
    return deferred.promise;
};


/********************
 * Define the Routes
 ********************/

/* index and view partials */
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

/* JSON API */
app.get('/api/name', api.name);


/**********************
 * PROXY operations
 **********************/
/*
 * Search Corpus(solr) for SMK artworks
 *
 * Proxy to SMKs collectionspace solr instance as browser rejects cross origin
 * requests. Response can be chunked, so we pipe all chunks back to the client.
 *
 * Usage : searchsmk?id=KMS1
 */
app.get('/searchsmk', function (req, res) {

    var id = req.query.id;
    var options = {
        host: 'localhost',           //'csdev-seb',
        port: 8983,                    // 8180,
        path: '/solr/prod_CATS/' +     //'/solr-example/dev_cats/
        'select?q=id_s%3A' + id + '&wt=json&indent=true', /*id_s also works on verso & multiworks*/
        method: 'GET'
    };
    var proxy = http.request(options, function (resp) {
        resp.pipe(res, {
            end: true
        });
    });
    proxy.on('error', function (err) {
        // Solr is down or otherwise not visible
        logger.error("couldn't contact solr");
        res.send(502);  //"502 : Bad Gateway"
    });
    req.pipe(proxy, {
        end: true
    });
});

/********************
 * SAMPLE operations
 ********************/
/**
 * Retrieve all samples
 *
 * Returns JSON or an Excel .xlxs binary, depending on the media type accepted by the client.
 *
 * Optionally accepts the following filter parameters :
 *        fulltext (mongodb full text search on all samples)
 *        sampletype
 *        startDate
 *        endDate
 *        pageNum
 *        pageSize
 *        count (if 'true' only returns a result count)
 *
 * Usage: 1. All samples         : sample
 *        2. Samples with filter : sample?type=sample&fulltext=blue&sampletype=Paint%20Cross%20Section
 *                                 &startDate=&endDate==&pageNum=1&pageSize=50
 */
app.get('/sample', function (req, res) {

    /*use the HTTP content negotiator library to parse requested media types*/
    var media = new negotiator(req);
    var supportedMedia = ['application/json', 'application/vnd.openxmlformats'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {

        var pageSize = parseInt(req.query.pageSize);
        /*limit() requires int*/
        var pageNum = parseInt(req.query.pageNum);

        var query = buildSampleQuery(req);

        if (req.query.count == 'true') {
            /*only return a count*/
            db.samples.find(query)
                .count(function (err, count) {
                    if (err || !count) {
                        res.status(200).send("0");
                    } else {
                        logger.info("searchSize: " + count);
                        res.status(200).send(count.toString());
                    }
                });
        } else {
            db.samples.find(query)
                .skip(pageNum > 0 ? ((pageNum - 1) * pageSize) : 0)
                .limit(pageSize)
                .sort('referenceNumber')
                .toArray(function (err, items) {
                    if (err || !items) {
                        logger.error(err);
                        res.status(500).send(err);
                    } else {
                        res.status(200).send(items);
                    }
                });
        }
    } else if (preferredMedia == 'application/vnd.openxmlformats') {

        var query = buildSampleQuery(req);
        var result = buildSampleExcel(query);

        result.then(function (report) {
            //this is called if promise has completed with success
            if (report == null) {
                res.send(500);
            } else {
                res.setHeader('Content-Type', preferredMedia);
                res.setHeader("Content-Disposition", "attachment; filename=" + "Report.xlsx");
                res.end(report, 'binary');
            }
        }, function (err) {
            //this is called if promise completed with failure
            res.send(500);
        });
    } else {
        res.send(406);
        /* "not acceptable" : we don't support the requested client media */
    }
});

/**
 * Retrieve a single sample
 *
 * Usage: sample/{sample _id}
 */
app.get('/sample/:id', function (req, res) {

    /*use the HTTP content negotiator library to parse requested media types*/
    var media = new negotiator(req);
    var supportedMedia = ['application/json'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {
        var id = req.params.id;

        try {
            id = db.ObjectId(id);
        } catch (err) {
            res.send(400);
            /*bad request, id probably not hex*/
            return;
        }
        var query = {'_id': id};

        db.samples.find(query)
            .toArray(function (err, items) {
                if (err || !items) {
                    logger.error(err);
                    res.status(500).send(err);
                } else {
                    res.status(200).send(items);
                }
            });
    } else {
        res.send(406);
        /* "not acceptable" : we don't support the requested client media */
    }
});

/**
 * Create a sample
 *
 * Create or update the record depending on the existence of the "_id" parameter in the body
 * Probably not very RESTful as the client doesn't know if a new resource will be created.
 *
 * Body may or may not contain an '_id', which may or may not be an existing one
 *
 * Returns the relative path of the updated object in the 'location' header.
 */
app.post('/sample', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
        return;
    }
    var body = req.body;

    if (!body || JSON.stringify(body) == '{}') {
        res.send(400);
        /*bad request, no body*/
        return;
    }
    try {
        body._id = db.ObjectId(body._id);
    } catch (err) {
        res.send(400);
        /*bad request, id probably not hex*/
        return;
    }
    var query = {'_id': body._id};
    var options = {'upsert': true};

    db.samples.update(query, body, options, function (err, response) {
        if (err || !response) {
            logger.info(body.sampleType + " not saved");
            res.send(500);
            /*server error*/
        } else {
            logger.info('q: ' + JSON.stringify(query));
            logger.info('b: ' + JSON.stringify(body));
            logger.info('o: ' + JSON.stringify(options));
            logger.info('upsert  successful ');
            var status = 201;

            var _id = '';
            if (req.body._id) {
                _id = req.body._id;
            } else if (response.upserted) {
                _id = response.upserted[0]._id;
            }

            if (response.updatedExisting) {
                status = 200;
            }
            res.header('Location', 'sample/' + _id);
            res.status(status).send(response);
        }
    });
});

/**
 * Delete a sample
 *
 * If successful returns the number of deleted records. Should only be an error if the
 * operation failed, even if resource is not found, delete has succeeded.
 */
app.delete('/sample/:id', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
        return;
    }

    var id = req.params.id;

    try {
        id = db.ObjectId(id);
    } catch (err) {
        res.send(400);
        return;
    }
    logger.info("DELETE " + id);

    db.samples.remove({"_id": id}, function (err, numberRemoved) {
        if (err) {
            logger.error("delete failed");
            res.status(500).send(err);
        } else {
            logger.info("delete successful");
            res.status(200).send(numberRemoved);
        }
    });
});

/*********************
 * USER operations
 *********************/

/**
 * Updates or inserts (upserts) a new user record in mongodb using mongojs.
 * Probably not very RESTful as the client doesn't know if a new resource will be created.
 *
 * Returns the relative path of the updated object in the the location header.
 *
 * Usage: POST with body = {"username": email, "password": password, "role": role}
 *
 * Command line hint: curl -H "Content-Type: application/json"
 *                     --cookie "connect.sid=s%3AIzaNbY6BuBKwcZxkdKI73Mo4.S6hhH7mzJPooqfXPI4TPIdKZws3Cxq3lDYmL%2FEtqgNw"
 *                     -d '{"username":"a_user@smk.dk", "password":"a_password"}'
 *                     http://localhost:3000/user
 */
app.post('/user', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
        /*unauthorised*/
        return;
    }
    ;

    /* send user details in request body rather than as url parameters to avoid
     * server logging and browser history caching */
    var username = req.body.username;
    var password = req.body.password;
    var role = req.body.role;

    if (!username || !password) {
        res.send(400);
        /*bad request*/
        return;
    }

    /*only admin can edit others passwords*/
    if (req.user.username != username && req.user.role != "admin") {
        res.send(401);
        /*unauthorised*/
        return;
    }
    ;

    /*Only admin can alter role*/
    if (req.user.role != "admin") {
        role = "default";
    }
    ;

    /*setup mongo findAndModify options*/
    var options = {};
    options.query = {'username': username};
    /*query by username*/
    options.upsert = true;
    /*if query doesn't find a record then insert a new one */
    options.new = true;
    /*return the modified document (not the original)*/
    options.fields = {username: 1};
    /*define fields for the returned document: just the id*/

    password = encrypt(password, function (err, hash) {

        /*called when encrypt resolved*/
        options.update = {$set: {"username": username, "password": hash, "role": role}};
        /*data to write to the record*/

        if (err || !hash) {
            logger.error("could not encrypt password");
            res.status(500).send(err);
        } else {
            db.users.findAndModify(options, function (err, record, lastErr) {
                if (err || !record) {
                    logger.error("user " + username + " not saved");
                    res.status(500).send(err);
                } else {
                    logger.info('user upsert successful, username: ' + record.username);
                    res.header('Location', 'user/' + record._id);
                    res.status(200).send(record);
                }
            });
        }
    });
});

/**
 * Delete a user profile
 * If successful returns the number of deleted records
 *
 * Usage: user?username=someuser@smk.dk
 */
app.delete('/user', function (req, res) {

    if (!req.isAuthenticated() || req.user.role != "admin") {
        res.send(401);
        return;
    }
    ;

    if (!req.query || !req.query.username) {
        res.send(400);
        return;
    }
    var username = req.query.username;

    db.users.remove({"username": username}, function (err, numberRemoved) {
        if (err || !numberRemoved) {
            logger.error("delete failed");
            res.status(500).send(err);
        } else {
            logger.info("delete successful");
            res.status(200).send(numberRemoved);
        }
    });
});

/*********************
 * ARTWORK operations
 *********************/

/**
 * Updates or inserts (upserts) a new artwork record in mongodb using mongojs
 * Probably not very RESTful as the client doesn't know if a new resource will be created
 *
 * Returns the relative path of the updated object in the the location header
 *
 * Usage: POST with {artworkbody}
 *
 */
app.post('/artwork', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
        return;
    }
    ;

    var body = req.body;

    if (!body || JSON.stringify(body) == '{}') {
        res.send(400);
        /*bad request, no body*/
        return;
    }

    try {
        body._id = db.ObjectId(body._id);
    } catch (err) {
        res.send(400);
        /*bad request, id probably not hex*/
        return;
    }

    var options = {};
    options.query = {'_id': body._id};
    /*query by _id*/
    options.upsert = true;
    /*if query doesn't find a record then insert a new one */
    options.new = true;
    /*return the modified document (not the original)*/
    options.fields = {_id: 1};
    /*define fields for the returned document: just the id*/
    options.update = {$set: body};
    /*data to write to the record*/

    /* findAndModify() can upsert a single record and return the new record _id, which update()
     * cannot*/
    db.artworks.findAndModify(options, function (err, record, lastErr) {
        if (err || !record) {
            logger.error("artwork " + body.title + " not saved");
            res.status(500).send(err);
        } else {
            logger.info('artwork upsert successful, _id: ' + record._id);
            res.header('Location', 'artwork/' + record._id);
            res.status(200).send(record);
        }
    });
});

/**
 * Retrieve artwork(s)
 * If successful returns the artwork object in json
 *
 * Optionally accepts the following filter parameter :
 *         invNum
 *
 * Usage: artwork?invNum=KMS456
 */
app.get('/artwork', function (req, res) {

    var media = new negotiator(req);
    var supportedMedia = ['application/json'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {

        var query = {};
        var invNum = req.query.invNum;

        if (invNum) {
            /* Regex will be inefficient, but we must have a case insensitive search for
             * inventory numbers as we don't want to duplicate records */
            var rg = new RegExp('^' + invNum + '$', "i");
            query = {"inventoryNum": {"$regex": rg}};
        }

        db.artworks.find(query)
            .toArray(function (err, items) {
                if (err || !items) {
                    logger.error("failed to retrieve artworks with query : " + JSON.stringify(query));
                    res.status(500).send(err);
                } else {
                    logger.info("found artworks");
                    res.status(200).send(items);
                }
            })
    } else {
        res.send(406);
        /* "not acceptable" : we don't support the requested client media */
    }
});

/**
 * Retrieve an artwork by id
 * If successful returns the artwork object in json
 *
 * Usage: user/{artwork _id}
 */
app.get('/artwork/:id', function (req, res) {

    var media = new negotiator(req);
    var supportedMedia = ['application/json'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {

        var id = req.params.id;

        try {
            id = db.ObjectId(id);
        } catch (err) {
            res.send(400);
            return;
        }
        db.artworks.find({"_id": id})
            .toArray(function (err, items) {
                if (err || !items) {
                    logger.error("failed to retrieve artwork id : " + id);
                    res.status(500).send(err);
                } else {
                    logger.info("found artwork by id: " + id);
                    res.status(200).send(items);
                }
            })
    } else {
        res.send(406);
        /* "not acceptable" : we don't support the requested client media */
    }
});

/**
 * Retrieve diff between SMKArtwork and sample-related work
 * testval: var value = '77d9d483-7da1-4e11-af57-5aafd6a31174';
 */

app.get('/awdiff/:value', function (req, res) {

    var awSelector = {};
    var sampleSelector = {};
    var value = req.params.value;
    var key = "corpusId";

    awSelector['corpusId'] = value;
    sampleSelector['artwork.corpusId'] = value;


    function myLookup(selector) {

        var deferred = Q.defer();
        db.artworks.findOne(selector,
            function (err, items) {
                if (err || !items) {
                    logger.error("failed to retrieve artworks with query : " + JSON.stringify(selector));
                    deferred.reject(err);
                } else {
                    logger.info("found artworks");
                    logger.info("retrieve artworks with query : " + JSON.stringify(selector));
                    deferred.resolve(items);
                }
            });
        return deferred.promise;
    };

    myLookup(awSelector).then(function (data) {

        Q(smkRoutes.smkSearch(value)).then(function (retval) {
            logger.debug(JSON.parse(retval).response.docs[0].title_first);
            logger.debug(smkRoutes.keysToCats(JSON.parse(retval).response.docs[0]));

            // now diff
            var myDiff = diff(data, smkRoutes.keysToCats(JSON.parse(retval).response.docs[0]));

            // build options for bulk-update
            var tmpKey = "";
            var tmpVal = "";
            var sampleUpdator = {};
            var awUpdator = {};
            var counter = 0;

            myDiff.forEach(function (item) {
                logger.info("diff: " + JSON.stringify(item));
                if (item.kind == 'E') {
                    tmpKey = "artwork." + item.path;
                    tmpVal = item.rhs;
                    sampleUpdator[tmpKey] = tmpVal;
                    awUpdator[item.path] = item.rhs;
                    counter++;

                }
            });
            if (counter <= 0) {
                res.header('Location', 'browse/');
                res.status(200).send("ok");
            } else {
                logger.info("Changes observed");
                // first update embedded artworks

                /* test string
                 bulk.find({'artwork.corpusId': '7cf3a4d5-95e2-4499-a412-edac64c7d65c'}).update({$set: {'artwork.artist':'Jan Szteen',"artwork.title":"David hyldes efter sejren over Goliat og filistrene"}});
                 */
                logger.debug("Upd: " + JSON.stringify(sampleUpdator));
                logger.debug("UpdAw: " + JSON.stringify(awUpdator));
                logger.debug("QAs: " + JSON.stringify(awSelector));
                logger.debug("QSample: " + JSON.stringify(sampleSelector));

                var col = db.collection("samples");
                var bulk = col.initializeOrderedBulkOp();
                bulk.find(sampleSelector).update({$set: sampleUpdator});

                bulk.execute(function (err, result) {
                    if (err) {
                        logger.error(err);
                    }
                    logger.info("Changed: " + result.nMatched + " " + result.nModified);
                });
                // now update artworks
                db.artworks.update(awSelector, {$set: awUpdator}, function (err, record, lastErrorObject) {

                    if (err || !record) {
                        logger.error("user not saved");
                        res.status(500).send(err);
                    } else {
                        logger.info('successfully updating: ' + JSON.stringify(record));
                        res.header('Location', 'browse/');
                        res.status(200).send(record);
                    }

                });

            }
        });
    });

});



/********************
 * VOCAB operations
 ********************/

/**
 * Updates or inserts (upserts) a new vocab item in mongodb using mongojs.
 * Probably not very RESTful as the client doesn't know if a new resource will be created.
 *
 * Returns the relative path of the updated object in the the location header and the whole
 * vocab list in the body
 *
 * Expected input:
 * {item : {name: 'Material Sample', secondaryname: '', grp:'Physical samples'}}
 *
 * Behaviour: "item" will be added to the "items" array of the same "sampleType":
 * {type : ':type', items : [{name: 'Material Sample', secondaryname: '', grp:'Physical samples'},
 *                                {name: 'Paint Cross Section', secondaryname: '', grp:'Physical samples'} ]}
 *
 * Returns: the whole vocab list
 * */
app.post('/vocab/:type/items', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
        return;
    }
    ;

    var type = req.params.type;
    var body = req.body;

    if (!body || JSON.stringify(body) == '{}') {
        res.send(400);
        /*bad request, no body*/
        return;
    }

    var query = {'type': type, 'items.name': body.item.name};
    db.vocabs.find(query).toArray(function (err, items) {
        /*if vocab doesn't exist*/
        if (err || !items || items.length == 0) {
            /* create vocab
             * inserts a new entry if a vocab named "body.type" already exists
             * note: db.vocabs.update({type:'colours'}, {$addToSet: {items: {name:'pulk', secondaryname:'', grp:'xxxx'}}})
             */
            var options = {};
            var query = {'type': type};
            var update = {
                $addToSet: {
                    items: {
                        name: body.item.name,
                        secondaryname: body.item.secondaryname,
                        grp: body.item.grp
                    }
                }
            };
            db.vocabs.update(query, update, options, function (err, created) {
                if (err || !created) {
                    logger.error(type + " not created");
                    res.send(500);
                } else {
                    logger.info('created successful ');
                    res.header('Location', 'vocab/' + type);
                    res.status(200).send(created);
                }
            });

        } else {
            /*overwrites an existing entry*/
            var options = {};
            var query = {'type': type, 'items.name': body.item.name};
            var update = {
                $set: {
                    "items.$.name": body.item.name,
                    "items.$.secondaryname": body.item.secondaryname,
                    "items.$.grp": body.item.grp
                }
            };
            db.vocabs.update(query, update, options, function (err, updated) {
                if (err || !updated) {
                    logger.error(type + " not updated");
                    res.send(500);
                } else {
                    logger.info('update successful');
                    res.header('Location', 'vocab/' + type);
                    res.status(200).send(updated);
                }
            });
        }
    });
});

/**
 * Retrieve a single vocab by type
 * If successful returns the vocab object in json
 *
 * Usage: vocab/{type}
 */
app.get('/vocab/:type', function (req, res) {

    var media = new negotiator(req);
    var supportedMedia = ['application/json'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {

        var type = req.params.type;
        var query = {"type": type};

        db.vocabs.find(query)
            .toArray(function (err, items) {
                if (err || !items || !items.length) {
                    logger.error("vocab " + type + " not found");
                    res.send(404);
                } else {
                    logger.info('get vocab successful');
                    res.status(200).send(items);
                }
            })
    } else {
        res.send(406);
    }
});

/**
 * Retrieve all vocabs
 * If successful returns all the vocab objects in json
 *
 * Usage: vocab
 */
app.get('/vocab', function (req, res) {

    var media = new negotiator(req);
    var supportedMedia = ['application/json'];
    var preferredMedia = media.mediaType(supportedMedia);

    if (preferredMedia == 'application/json') {
        db.vocabs.find()
            .toArray(function (err, items) {
                if (err || !items || !items.length) {
                    logger.error("vocabs not found");
                    res.send(404);
                } else {
                    logger.info('get all vocabs successful');
                    res.status(200).send(items);
                }
            })
    } else {
        res.send(406);
    }
});

/********************
 * IMAGE operations
 ********************/
/**
 * Save an image : incomplete
 *
 * Very basic implementation saves the incoming file directly to SMKs image server filesystem which
 * we've used for testing. Ideally, this would be our interface to a DAM but as it stands we don't
 * have this in place yet. As it stands, this will always return '500' unless the 'writePath' is
 * hardcoded below.
 *
 * Responses:
 * 201 (Created): Body & location header contain the object url
 * 401 (Unauthorised) : User is not logged in
 * 409 (Conflict): An image of that name aready exists
 * 413 (Request entity too large) : Handled and returned by express.multipart module
 * 500 (internal Server Error): Problem reading or writing the file
 */
app.post('/image', function (req, res) {

    if (!req.isAuthenticated()) {
        res.send(401);
    }
    ;

    /* If bodyParser "defer" option is set, then we need to wait for the end of
     * the "Formidable" form before we can read the file
     * */
    req.form.on('progress', function (bytesReceived, bytesExpected) {
        logger.info(((bytesReceived / bytesExpected) * 100) + "% uploaded");
    });
    req.form.on('end', function () {
        var readPath = req.files.file.path;
        var writePath = config.imageDir;
        var name = req.files.file.name;

        fs.readFile(readPath, function (err, data) {
            if (err || !writePath) {
                logger.error(err);
                res.status(500).send(err);
                /*"Internal server Error"*/
            }
            else {
                fs.exists(writePath + name, function (exists) {
                    if (exists) {
                        res.send(409);
                    } else {
                        fs.writeFile(writePath + name, data, function (err) {
                            if (err) {
                                logger.error(err);
                                res.status(500).send(err);
                            } else {
                                var url = config.imageHostName + "/image/" + name;
                                logger.info("The file was saved to " + url);
                                res.header('Location', url);
                                res.status(201).send(url);
                            }
                        })
                    }
                })
            }
        })
    });
});

/**
 * Retrieve an image
 */
app.get('/image/:name', function (req, res, next) {

    var name = req.params.name;
    var width = req.query.width;

    var readPath = config.imageDir + name;
    logger.info("readpath, width: " + readPath + ", " + width);

    gm(readPath)
        .resize(width)
        .stream(function streamOut(err, stdout, stderr) {
            if (err) return next(err);
            stdout.pipe(res); //pipe to response
            stdout.on('error', next);
        });
});

/********************
 * RECORD operations
 ********************/

//redirect all others to the index (HTML5 history)
app.get('*', routes.index);

/***************
 * Start Server
 ***************/

/*To generate certificates :
 *
 *    http://stackoverflow.com/questions/12871565/how-to-create-pem-files-for-https-web-server
 *
 *    To generate certificate request (csr) to send to authority:
 *    openssl req -newkey rsa:2048 -new -nodes -keyout catsdb-key.pem -out catsdb-csr.pem
 *
 *    OR to create a self signed for local testing (expires 10 years)
 *    openssl req -newkey rsa:2048 -new -nodes -x509 -days 3650 -keyout catsdb-key.pem -out catsdb-cert.pem
 *
 var options = {
 key: fs.readFileSync('/etc/ssl/certs/catsdb-key.pem'),
 cert: fs.readFileSync('/etc/ssl/certs/catsdb-cert.pem')
 };

 https.createServer(options, app).listen(config.port, function () {
 logger.info('Express server listening on port ' + config.port);
 });
 */
/*For testing, or if encryption is not required, comment out the lines above and
 use this regular http server instead.
 */
http.createServer(app).listen(config.port, function () {
    logger.info('Express server listening on port ' + config.port);
});

