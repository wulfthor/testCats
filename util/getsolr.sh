#!/bin/bash

target=$1
server="localhost"
port="8983"
core="prod_CATS"
count=0

if [ $# -eq 0 ]; then
  echo "usage: getsolr.sh <id> [server <default localhost>] port <default 8983>] core <default prod_CATS]]]"
  exit
fi

if [ $# -eq 2 ]; then
  server=$2
elif [ $# -eq 3 ]; then
  server=$2
  port=$3
elif [ $# -eq 4 ]; then
  server=$2
  port=$3
  core=$4
fi

#server=$1
#core=$2


curl http://$server:$port/solr/$core/select?q=id:$target\&wt=json\&indent=true -s > cont.json
#node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(process.argv[1])), null, 4).docs);"  cont.json 
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('cont.json')).response.docs[0], null, 4));"  

