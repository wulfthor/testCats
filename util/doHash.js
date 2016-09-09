var args = require("minimist")(process.argv.slice(2),{ string: "name" });
var bcrypt = require('bcrypt');
var ministry = require('bcrypt');

var salt = bcrypt.genSaltSync(10);
var hash = bcrypt.hashSync(args.name, salt);
console.log(hash);
