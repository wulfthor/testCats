#!/bin/bash

numargs=$#
# default values
DATABASE=cats
COLLECTION=samples

while [[ $# > 0 ]]
do
key="$1"

case $key in
    -d|--database)
    DATABASE="$2"
    shift # past argument
    ;;
    -c|--collection)
    COLLECTION="$2"
    shift # past argument
    ;;
    -t|--type)
    TYPE="$2"
    if [ $TYPE = "byid" ]; then
      FIELD="def"
    fi
    if [ $TYPE = "embedAW" ]; then
      FIELD="inventoryNum"
    fi
    shift # past argument
    ;;
    -f|--field)
    FIELD="$2"
    shift # past argument
    ;;
    -v|--value)
    VALUE="$2"
    shift # past argument
    ;;
    -h|--help)
      echo "usage: catsdb.sh -d <database> -c <collection> -t <type:all [-v <limit>] ,oneran,byfield,byid,byfieldspec,embedAW> -f <field> -v <value>"
      exit
    ;;
    --default)
    DEFAULT=YES
    ;;
    *)
            # unknown option


    ;;
esac
shift # past argument or value
done
if [[ -n $1 ]]; then
    echo "Last line of file specified as non-opt/last argument:"
    tail -1 $1
fi

if [ $TYPE = "all" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.find({},{$FIELD:1}).pretty().limit($VALUE);
EOF
fi
if [ $TYPE = "oneran" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.findOne();
EOF
fi

if [ $TYPE = "byfieldspec" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.find({$FIELD:$VALUE}).pretty();
EOF
fi

if [ $TYPE = "byfield" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.find({$FIELD:/$VALUE/}).pretty();
EOF
fi
if [ $TYPE = "byid" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.find({_id:ObjectId("$VALUE")}).pretty();
EOF
fi

if [ $TYPE = "embedAW" ];then
/usr/local/bin/mongo --quiet --host=localhost:27017 << EOF
DBQuery.shellBatchSize = 300;
use $DATABASE;
db.$COLLECTION.find({'artwork.inventoryNum': "$VALUE"},{'referenceNumber': 1, 'artwork':1}).pretty();
EOF
fi


#db.$coll.find({_id:$id},{_id:1})
#db.$coll.find({_id:$id},{_id:1})
