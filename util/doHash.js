// Load the bcrypt module
//
var args = require("minimist")(process.argv.slice(2),{ string: "name" });
var bcrypt = require('bcrypt');
var ministry = require('bcrypt');
// // Generate a salt
var salt = bcrypt.genSaltSync(10);
// // Hash the password with the salt
var hash = bcrypt.hashSync("test123", salt);
console.log(hash);
