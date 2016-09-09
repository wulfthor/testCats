var exec = require('child_process').exec;

function getHelp() {
  console.log("usage: node crUser --pw=<password> --us=<username> --rl=<role>");
  console.log("");
}
var args = require("minimist")(process.argv.slice(2),{ string: "pw", string: "us", string: "rl" });

if (args.help) {
  getHelp();
  process.exit(1);
}
  
var bcrypt = require('bcrypt');
var ministry = require('bcrypt');
var salt = bcrypt.genSaltSync(10);
var db = "cats";
var hash = bcrypt.hashSync(args.pw, salt);
console.log(hash);
//var string = "db.users.find({\"username\": \"" + args.us + "\"}).forEach(function(x){printjson(x);})";
var string = "db.users.find({\"username\": /" + args.us + "/}).forEach(function(x){printjson(x);})";
var cmd = "mongo cats --eval '" + string + "'";
console.log(cmd);

exec(cmd, function(error, stdout, stderr) {
  if(error)
    console.log(error);
  else
    console.log(stdout);
});
