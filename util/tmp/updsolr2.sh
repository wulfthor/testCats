#!/bin/bash

curl http://localhost:8983/solr/prod_CATS/select?q=id:$1\&wt=json\&indent=true -s > cont.json
#node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync(process.argv[1])), null, 4).docs);"  cont.json 
node -e "console.log(JSON.stringify(JSON.parse(require('fs').readFileSync('cont.json')).response.docs[0], null, 4));"  

