#!/bin/bash

file=$1
curl http://localhost:8983/solr/prod_CATS/update?commit=true -H 'Content-type:application/json' --data @${file}
