'use strict'

console.log('ENV_VARS', process.env)

module.exports = function (config) {
  config.set({
    browserNoActivityTimeout: 10 * 60 * 1000,
    browserDisconnectTimeout: 10 * 60 * 1000,
    browserSocketTimeout    : 10 * 60 * 1000,
    // captureTimeout: 900000,
    // processKillTimeout: 2000,

    browsers: process.env.GITHUB_WORKFLOW
      ? (
        process.platform === 'linux' ? [
          'ChromiumCI',
          'ChromeLatest',
        ]
          : process.platform === 'darwin' ? [
            'SafariLatest',
          ]
            : []
      )
      : [
        'LocalChromium39',
        'ChromeLatest',
        'FirefoxHeadless',
      ],
    files     : ['dist/browser/browser.test.js'],
    frameworks: ['mocha'],
    reporters : ['progress', 'coverage'],
    plugins   : [
      'karma-chrome-launcher',
      'karma-firefox-launcher',
      'karma-safari-launcher',
      'karma-mocha',
      'karma-coverage',
      '@flemist/karma-custom-launcher',
    ],
    coverageReporter: {
      // Prevent to disable coverage by IntelliJ
      // see: https://github.com/karma-runner/karma-coverage/issues/183#issuecomment-167880660
      instrumenter: null,

      type: 'json',
      dir : `tmp/coverage/karma/json`,
    },
    customLaunchers: {
      ChromeLatest: {
        base  : 'Custom',
        parent: 'ChromeHeadless',
        flags : [
          '--incognito',
          '--no-sandbox',
          '--disable-web-security',
          '--allow-cross-origin-auth-prompt',
          '--disable-site-isolation-trials',
        ],
      },
      SafariLatest: {
        base  : 'Custom',
        parent: 'SafariHeadless',
        flags : [

        ],
      },
      ChromiumCI: {
        base       : 'Custom',
        parent     : 'ChromiumHeadless',
        displayName: 'Chromium CI',
        flags      : [
          '--headless',
          '--incognito',
          '--no-sandbox',
          // '--disable-setuid-sandbox',
          '--disable-gpu',
          '--disable-web-security',
          '--allow-cross-origin-auth-prompt',
          '--disable-site-isolation-trials',
          '--enable-precise-memory-info',
        ],
        DEFAULT_CMD: {
          linux: process.env.CHROMIUM_BIN,
        },
        ENV_CMD: null,
      },
      LocalChromium33: {
        base       : 'Custom',
        parent     : 'ChromiumHeadless',
        displayName: 'Chromium 33.0.1750.170',
        flags      : [
          '--incognito',
          '--no-sandbox',
          '--disable-web-security',
          '--allow-cross-origin-auth-prompt',
          '--disable-site-isolation-trials',
        ],
        DEFAULT_CMD: {
          win32: 'E:/Program Files (x86)/Chromium/33.0.1750.170/chrome.exe',
        },
        ENV_CMD: null,
      },
      LocalChromium39: {
        base       : 'Custom',
        parent     : 'ChromiumHeadless',
        displayName: 'Chromium 39.0.2171.99',
        flags      : [
          '--incognito',
          '--no-sandbox',
          '--disable-web-security',
          '--allow-cross-origin-auth-prompt',
          '--disable-site-isolation-trials',
        ],
        DEFAULT_CMD: {
          win32: 'E:/Program Files (x86)/Chromium/39.0.2171.99/chrome.exe',
        },
        ENV_CMD: null,
      },
      LocalChromium44: {
        base       : 'Custom',
        parent     : 'ChromiumHeadless',
        displayName: 'Chromium 44.0.2403.119',
        flags      : [
          '--incognito',
          '--no-sandbox',
          '--disable-web-security',
          '--allow-cross-origin-auth-prompt',
          '--disable-site-isolation-trials',
        ],
        DEFAULT_CMD: {
          win32: 'E:/Program Files (x86)/Chromium/44.0.2403.119/chrome.exe',
        },
        ENV_CMD: null,
      },
    },
  })
}
