#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// save the project root path
const PROJECT_ROOT = process.cwd();
const packageJson = JSON.parse(
  readFileSync(join(PROJECT_ROOT, "package.json"), "utf8")
);

// read the package.json devDependencies and save everything starting with @rehearsal/* to the resolutions object
Object.keys(packageJson.devDependencies).forEach((key) => {
  if (key.startsWith("@rehearsal/")) {
    packageJson.resolutions = packageJson.resolutions || {};
    packageJson.resolutions[key] = packageJson.devDependencies[key];
  }
});

// write the package.json file
writeFileSync(
  join(PROJECT_ROOT, "package.json"),
  JSON.stringify(packageJson, null, 2)
);
