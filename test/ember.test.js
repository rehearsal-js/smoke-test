#!/usr/bin/env node

import { describe, expect, test, beforeEach, beforeAll } from 'vitest';
import { join } from 'path';
import { Project } from 'fixturify-project';
import { commandSync } from 'execa';
import { runCommandFactory, setupEmberProject, resolveCLIBin } from './test-helpers';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { afterEach } from 'vitest';

const superRentalsHashes = {
  //   'ember-source@~4.5': '9c510c46bff431f146bbbd9820a05a8e57c9b2eb',
  'ember-source@~3.27': 'f1a8cf65bcdd8da7b96bf129a0d618ef94e75601'
};

describe('validation-test ember@3.28 LTS', () => {
  let run;
  let pathToSuperRentals;
  let project;

  beforeAll(() => {
    const tmpDir = new URL('../tmp/', import.meta.url);

    if (!existsSync(tmpDir)) {
      commandSync(`mkdir -p ${fileURLToPath(tmpDir)}`, { shell: true });
    }

    const hash = superRentalsHashes['ember-source@~3.27'];
    pathToSuperRentals = join(fileURLToPath(tmpDir), `super-rentals-${hash}`);

    if (!existsSync(pathToSuperRentals)) {
      // Download archive
      const archiveURL = `https://github.com/ember-learn/super-rentals/archive/${hash}.zip`;

      commandSync(`wget ${archiveURL}`, {
        cwd: tmpDir,
        shell: true
      });
      commandSync(`unzip ${hash}.zip`, { cwd: tmpDir, shell: true });
      commandSync(`rm ${hash}.zip`, { cwd: tmpDir, shell: true });
      commandSync('pnpm install', { cwd: pathToSuperRentals });
    }
  });

  beforeEach(async () => {
    project = Project.fromDir(pathToSuperRentals, { linkDeps: true, linkDevDeps: true });

    project.addDevDependency('ember-source', '~3.28.0');
    project.addDevDependency('ember-cli', '~3.28.0');

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

    // Setup project with dependencies to use rehearsal e.g. typescript, eslint, prettier, @glint/*
    await setupEmberProject(project);

    const bin = resolveCLIBin(project);
    // Set up command for tests
    run = runCommandFactory(bin, { cwd: project.baseDir });
  });

  afterEach(() => {
    project.dispose();
  });

  test('graph', () => {
    const results = run(['graph']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout, 'should show ordering between locale service and share-button')
      .toContain(`[DATA] app/services/locale.js
[DATA] app/components/share-button.js`);

    expect(results.stdout).toMatchSnapshot();
  });

  test('migrate', () => {
    const results = run(['migrate', '--ci']);

    expect(results.exitCode).toBe(0);
    expect(results.stdout).toContain('[STARTED] Convert JS files to TS');
    expect(results.stdout).toContain('[SUCCESS] Migration Complete');
  });
});
