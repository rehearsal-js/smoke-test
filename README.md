# smoke-test
[![Build Status](https://github.com/rehearsal-js/smoke-test/workflows/CLI-Smoke-Test/badge.svg)](https://github.com/rehearsal-js/smoke-test/actions/workflows/run-smoke-test.yml)

The purpose of this package is to provide a simple smoke test for @rehearsal/cli commands. It is not intended to be used in production, nor should it be published to npm.

Notice this is a JavaScript package with the only @rehearsal dependency being @rehearsal/cli. TypeScript should NOT be configured by default in this package. This package should mimic the user experience as closely as possible.

The @rehearsal/cli binary imported is coming from the "download-rehearsal-cli" script we want to test the CLI binary that is downloaded from the master branch of https://github.com/rehearsal-js/rehearsal-js and NOT the @rehearsal/cli version published to npm

### steps to develop locally
  - `brew install wget` if wget is not installed
  - `pnpm install`
  - `sh download-rehearsal-cli.sh`
  - `pnpm run update-resolutions`
  - `pnpm test`