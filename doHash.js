// Load the bcrypt module
//
var args = require("minimist")(process.argv.slice(2),{ string: "password" });
var bcrypt = require('bcrypt');
var ministry = require('bcrypt');
var pw = args.password;
// // Generate a salt
var salt = bcrypt.genSaltSync(10);
// // Hash the password with the salt
var hash = bcrypt.hashSync(pw, salt);
console.log(hash);
