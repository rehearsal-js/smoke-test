import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import Module from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { commandSync } from 'execa';
import { Project } from 'fixturify-project';
import JSON5 from 'json5';
import debug from 'debug';

import {
  readPackageJson,
  writePackageJson,
  findRehearsalPackages,
  updatePackageJson
} from '../utils';

const DEBUG_CALLBACK = debug('rehearsal:smoke-test');

const PROJECT_ROOT_URL = new URL('../', import.meta.url);
const PROJECT_ROOT_DIR = fileURLToPath(PROJECT_ROOT_URL);

const superRentalsHashes = {
  'ember-source@~4.5': '9c510c46bff431f146bbbd9820a05a8e57c9b2eb',
  'ember-source@~3.27': 'f1a8cf65bcdd8da7b96bf129a0d618ef94e75601'
};

function readTSConfig(baseDir) {
  return JSON5.parse(readFileSync(join(baseDir, './tsconfig.json'), 'utf-8'));
}

function writeTSConfig(baseDir, data) {
  writeFileSync(join(baseDir, './tsconfig.json'), JSON5.stringify(data, { space: 2, quote: '"' }));
}

function setupProjectWithRehearsalBinaries(project) {
  let packageJson = readPackageJson(project.baseDir);

  packageJson['packageManager'] = 'pnpm@7.12.1';
  // Get packageJson entries for @rehearsal packages from root package.json
  const packagePaths = findRehearsalPackages(readPackageJson(PROJECT_ROOT_DIR));

  // Add root relative paths to tarballs in package.json similar to this project
  packageJson = updatePackageJson(packageJson, packagePaths);

  writePackageJson(project.baseDir, packageJson);

  // Copy binaries from PROJECT_ROOT_DIR to fixture directory
  for (const [, packagePath] of packagePaths) {
    const tarballPath = join(PROJECT_ROOT_DIR, fileURLToPath(packagePath));
    const copyResults = commandSync(`cp ${tarballPath} ${project.baseDir}`, {
      cwd: PROJECT_ROOT_DIR
    });
    if (copyResults.exitCode !== 0) {
      throw new Error(
        `Copying ${tarballPath} to project fixture directory failed.\n${results.stderr}`
      );
    }
  }

  const results = commandSync('pnpm install', { cwd: project.baseDir });

  if (results.exitCode !== 0) {
    throw new Error(`Install failed; unable to setup project fixture.\n${results.stderr}`);
  }
}

export async function setupEmberProject(project) {
  addRehearsalDependencies(project);
  project.addDevDependency('@types/node', '18.15.12');
  project.addDevDependency('@glint/core', '^1.0.0');
  project.addDevDependency('@glint/template', '^1.0.0');
  project.addDevDependency('@glint/environment-ember-loose', '^1.0.0');
  project.addDevDependency('@glint/environment-ember-template-imports', '^1.0.0');
  project.addDevDependency('ember-cli-typescript', '5.2.1');
  project.addDevDependency('ember-template-imports', '3.4.2');

  // Required from @glint/core>=1.0.0
  project.addDevDependency('@glimmer/component', '^1.1.2');
  project.addDevDependency('ember-modifier', '^3.2.7');
  project.addDevDependency('@types/ember__component', '^4.0.8');

  await project.write();
  DEBUG_CALLBACK('Project Directory %s', project.baseDir);
  const opts = { cwd: project.baseDir, shell: true };
  // We have to use yarn for this step because ember cli doesn't know about pnpm usage.
  commandSync('yarn install', opts);
  commandSync('yarn ember install ember-cli-typescript', opts);

  // Append glint configuration entry to tsconfig.json

  const tsConfig = readTSConfig(project.baseDir);

  tsConfig['glint'] = {
    environment: ['ember-loose', 'ember-template-imports'],
    checkStandaloneTemplates: true
  };

  writeTSConfig(project.baseDir, tsConfig);

  setupProjectWithRehearsalBinaries(project);

  return project;
}

function addRehearsalDependencies(project) {
  // Typescript
  project.addDevDependency('typescript', '5.0.4');

  // Eslint
  project.addDevDependency('eslint', '8.38.0');
  project.addDevDependency('@typescript-eslint/eslint-plugin', '5.59.0');
  project.addDevDependency('@typescript-eslint/parser', '5.59.0');

  // Prettier
  project.addDevDependency('prettier', '2.8.7');
  project.addDevDependency('eslint-config-prettier', '8.8.0');
  project.addDevDependency('eslint-plugin-prettier', '4.2.1');
}

/**
 * Add the necessary devDependencies for a project fixture to run rehearasl.
 * @param {Project} project
 * @returns
 */
export async function setupProject(project) {
  addRehearsalDependencies(project);

  await project.write();

  setupProjectWithRehearsalBinaries(project);

  return project;
}

/**
 *
 * @param {Project} project fixturify-project
 * @returns string path to rehearsal/cli bin within the project fixture.
 */
export function resolveCLIBin(project) {
  // Resolve the rehearsal CLI bin relative the installed instance for project fixture
  const require = Module.createRequire(join(project.baseDir, 'package.json'));
  const bin = require.resolve('@rehearsal/cli/bin/rehearsal.js');
  return bin;
}

// Reference https://ihateregex.io/expr/semver/
const REGEX_REHEARSAL_PACKAGE_VERSION =
  /(?!\@rehearsal\/.*)(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?/;

function replaceVersion(output) {
  if (output && output.search(REGEX_REHEARSAL_PACKAGE_VERSION) > -1) {
    output = output.replace(REGEX_REHEARSAL_PACKAGE_VERSION, 'VERSION');
  }
  return output;
}

export function runCommandFactory(rehearsalCLIBin, factoryOptions) {
  return (args, options) => {
    const command = `node ${rehearsalCLIBin} ${args.join(' ')}`;
    const results = commandSync(command, {
      ...factoryOptions,
      ...options
    });

    DEBUG_CALLBACK('Command: %s', command);
    DEBUG_CALLBACK(results.stdout);

    results.stdout = replaceVersion(results.stdout);

    return results;
  };
}

export function getSimpleProjectFixture() {
  const project = new Project('simple', '1.0.0', {
    files: {
      'index.js': `
          import './lib/hotdog';
          import './lib/burger';
        `,
      lib: {
        'hotdog.js': `import './sandwich';`,
        'burger.js': `import './sandwich';`,
        'sandwich.js': `import 'chalk';`
      }
    }
  });
  project.pkg.exports = './index.js';
  project.pkg.volta = {
    node: '16.19.0'
  };

  project.addDependency('chalk', '5.2.0');

  return project;
}

export function getWorkspaceProjectFixture() {
  const project = new Project('library-with-workspace', '1.0.0');

  project.files = {
    packages: {
      foo: {
        'package.json': `{
              "name": "@something/foo",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/bar": "*"
              }
            }`,
        'index.js': `
              import './lib/a';
            `,
        lib: {
          'a.js': `
              // a.js
              console.log('foo');
             `
        }
      },
      bar: {
        'package.json': `{
              "name": "@something/bar",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
                "@something/baz": "*"
              },
              "devDependencies": {
                "@something/blorp": "*"
              }
            }`
      },
      baz: {
        'package.json': `{
              "name": "@something/baz",
              "version": "1.0.0",
              "main": "index.js",
              "dependencies": {
              }
            }`
      },
      blorp: {
        'package.json': `{
              "name": "@something/blorp",
              "version": "1.0.0",
              "main": "index.js"
            }`,
        'build.js': `import '../../some-shared-util';`,
        'index.js': `
              import './lib/impl';
            `,
        lib: {
          'impl.js': `
                // impl.js
              `
        }
      }
    },
    'package.json': `
          {
            "name": "library-with-workspace",
            "version": "1.0.0",
            "main": "index.js",
            "license": "MIT",
            "workspaces": [
              "packages/*"
            ]
          }
        `,
    'some-util.js': '// Some useful util file shared across packages.'
  };

  project.pkg.volta = {
    node: '16.19.0'
  };

  return project;
}

function setupSuperRentals(key) {
  const tmpDir = new URL('../tmp/', import.meta.url);

  if (!existsSync(tmpDir)) {
    commandSync(`mkdir -p ${fileURLToPath(tmpDir)}`, { shell: true });
  }

  if (!superRentalsHashes[key]) {
    throw new Error('Invalid key for super rentals');
  }

  const hash = superRentalsHashes[key];
  const pathToSuperRentals = join(fileURLToPath(tmpDir), `super-rentals-${hash}`);

  if (!existsSync(pathToSuperRentals)) {
    // Download archive
    const archiveURL = `https://github.com/ember-learn/super-rentals/archive/${hash}.zip`;

    commandSync(`wget ${archiveURL}`, {
      cwd: tmpDir,
      shell: true
    });
    commandSync(`unzip ${hash}.zip`, { cwd: tmpDir, shell: true });
    commandSync(`rm ${hash}.zip`, { cwd: tmpDir, shell: true });
    commandSync('yarn install', { cwd: pathToSuperRentals });
  }

  return pathToSuperRentals;
}

function patchEmberAppWithService(project) {
  // Add service and update a component to use that service.
  project.mergeFiles({
    app: {
      components: {
        'share-button.js': `import { inject as service } from '@ember/service';
    import Component from '@glimmer/component';

    const TWEET_INTENT = 'https://twitter.com/intent/tweet';

    export default class ShareButtonComponent extends Component {
      @service router;
      @service locale;

      get currentURL() {
        return new URL(this.router.currentURL, window.location.origin);
      }

      get shareURL() {
        let url = new URL(TWEET_INTENT);

        url.searchParams.set('url', this.currentURL);

        if (this.args.text) {
          url.searchParams.set('text', this.args.text);
        }

        if (this.args.hashtags) {
          url.searchParams.set('hashtags', this.args.hashtags);
        }

        if (this.args.via) {
          url.searchParams.set('via', this.args.via);
        }

        url.searchParams.set('locale', this.locale.current());

        return url;
      }
    }`
      },
      services: {
        'locale.js': `
            import Service from '@ember/service';

            export default class LocaleService extends Service {
                current() {
                    return 'en-US';
                }
            }
          `
      }
    }
  });
}

function patchEmberAppWithGjsComponent(project) {
  project.mergeFiles({
    app: {
      components: {
        'HelloWorld.gjs': `import Component from '@glimmer/component';

export default class Hello extends Component {
  name = 'world';

  <template>
    <span>Hello, I am {{this.name}} and I am {{@age}} years old!</span>
  </template>
}
`
      }
    }
  });
}

function getEmberApp3_28() {
  const pathToFixture = setupSuperRentals('ember-source@~3.27');
  const project = Project.fromDir(pathToFixture, { linkDeps: false, linkDevDeps: false });
  project.addDevDependency('ember-source', '~3.28.0');
  project.addDevDependency('ember-cli', '~3.28.0');
  return project;
}

function getEmberApp4_4() {
  const pathToFixture = setupSuperRentals('ember-source@~4.5');
  const project = Project.fromDir(pathToFixture, { linkDeps: false, linkDevDeps: false });
  project.addDevDependency('ember-source', '~4.4.0');
  project.addDevDependency('ember-cli', '~4.4.0');
  return project;
}

export async function getProjectFixture(variant) {
  if (variant == 'simple') {
    const project = getSimpleProjectFixture();
    await setupProject(project);
    return project;
  }
  if (variant == 'workspace') {
    const project = getWorkspaceProjectFixture();
    await setupProject(project);
    return project;
  }
  if (variant == 'ember-app-3.28') {
    const project = getEmberApp3_28();
    patchEmberAppWithService(project);
    patchEmberAppWithGjsComponent(project);
    await setupEmberProject(project);
    return project;
  }
  if (variant == 'ember-app-4.4') {
    const project = getEmberApp4_4();
    patchEmberAppWithService(project);
    patchEmberAppWithGjsComponent(project);
    await setupEmberProject(project);
    return project;
  }

  throw new Error(`Invalid project fixture variant: ${variant}`);
}

export function setupProjectRunner(project) {
  const run = runCommandFactory(resolveCLIBin(project), { cwd: project.baseDir });

  const readFile = (filePath) => {
    return readFileSync(join(project.baseDir, filePath), 'utf-8');
  };
  return { run, readFile };
}
