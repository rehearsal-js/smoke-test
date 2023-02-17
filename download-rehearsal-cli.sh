#!/bin/bash

# save the project root path
PROJECT_ROOT=$(pwd)

# cleanup any existing tgz files
rm -rf rehearsal-cli-*.tgz

# remove any existing @rehearsal/cli deps
pnpm remove @rehearsal/cli

# download the zip from latest github master and unzip it
wget https://github.com/rehearsal-js/rehearsal-js/archive/refs/heads/master.zip && unzip master.zip

# remove the zip
rm -rf master.zip

# go to the unzipped cli folder
cd rehearsal-js-master/packages/cli

# install rehearsal-cli dependencies
pnpm install

# build the cli
pnpm build

# create the tarball in the root project folder and cd back to the project root
pnpm pack --pack-destination $PROJECT_ROOT && cd $PROJECT_ROOT

# save the filename from pnpm pack into a sh variable
REHEARSAL_CLI_TGZ=$(ls rehearsal-cli-*.tgz)

# cleanup the unzipped files
rm -rf rehearsal-js-master

# clean up
rm -rf node_modules && rm pnpm-lock.yaml

# add @rehearsal/cli to package.json from tarball eg. file:rehearsal-cli-0.0.0.tgz
pnpm add -D file:$REHEARSAL_CLI_TGZ

# install smoke-test depdendencies
pnpm install