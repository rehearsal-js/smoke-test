#!/usr/bin/env node
import {
  findRehearsalPackages,
  readPackageJson,
  updatePackageJson,
  writePackageJson
} from './utils.js';
// save the project root path
const PROJECT_ROOT = process.cwd();

let packageJson = readPackageJson(PROJECT_ROOT);

// read the package.json devDependencies and save everything
// starting with @rehearsal/* to the resolutions object
const packagePaths = findRehearsalPackages(packageJson);

// Update the packageJson pojo with the found rehearsal packages.
packageJson = updatePackageJson(packageJson, packagePaths);

// write the package.json file
writePackageJson(PROJECT_ROOT, packageJson);
