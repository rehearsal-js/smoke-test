#!/bin/bash

# save the project root path
PROJECT_ROOT=$(pwd)

BRANCH=$1
ZIP_NAME=$(echo $BRANCH | sed "s/.*\///")
UNZIPPED_NAME=$(echo $BRANCH | sed -e 's/\//-/g')

# cleanup any existing tgz files
rm -rf rehearsal-*.tgz

# download the zip from the branch nd unzip it
wget https://github.com/rehearsal-js/rehearsal-js/archive/$BRANCH.zip

unzip ${ZIP_NAME}.zip

# remove the zip
rm -rf ${ZIP_NAME}.zip

# go to the unzipped folder
cd rehearsal-js-${UNZIPPED_NAME}

# install rehearsal-js dependencies
pnpm install --no-frozen-lockfile

# build the monorepo
pnpm build

# cd into the monorepo packages dir
cd packages

# loop over the packages and pack them all to the root project folder
for package in *; do
  cd $package
  echo $package
  pnpm pack --pack-destination $PROJECT_ROOT
  cd ..
done

# cd back to the project root
cd $PROJECT_ROOT

# cleanup the unzipped files
rm -rf rehearsal-js-${UNZIPPED_NAME} node_modules && rm pnpm-lock.yaml

# add @rehearsal/* to package.json from tarball eg. file:rehearsal-cli-0.0.0.tgz
# loop over every tgz file and add it to package.json
for tgz in *.tgz; do
  pnpm add -D file:$tgz
done