#!/bin/bash

target=$1
server="localhost"
port="8983"
core="prod_CATS"
count=0

if [ $# -eq 0 ]; then
  echo "usage: delsolr.sh <csid> [server <default localhost>] port <default 8983>] core <default prod_CATS]]]"
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

curl http://$server:$port/solr/$core/update?commit=true -H 'Content-type:text/xml' --data-binary  "<delete><query>csid:$1</query></delete>"
