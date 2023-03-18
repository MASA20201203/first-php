#!/usr/bin/env bash

set -e

basedir=$(cd $(dirname $0);pwd)
custom_env=${basedir}/run.env

logfile=${basedir}/log/yasumasa-likes.log

if [ -e ${custom_env} ]; then
    source ${custom_env}
fi

cd ${basedir}

date >> ${logfile}
node ./dist/index.js >> ${logfile}
