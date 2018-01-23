/* eslint-env node */
/* global require, module */
'use strict';

const fs = require('fs');
var EmberApp = require('ember-cli/lib/broccoli/ember-app');
const Funnel = require('broccoli-funnel');
const nonCdnEnvironments = ['development', 'test'];

module.exports = function(defaults) {
    var config = require('./config/environment')(process.env.EMBER_ENV);
    const useCdn = (nonCdnEnvironments.indexOf(process.env.EMBER_ENV) === -1);

    const css = {
        'app': '/assets/registries-service.css'
    };

    const brands = fs.readdirSync('./app/styles/brands');

    for (let brand of brands) {
        if (/^_/.test(brand))
            continue;

        brand = brand.replace(/\..*$/, '');
        css[`brands/${brand}`] = `/assets/css/${brand}.css`;
    }

    // Reference: https://github.com/travis-ci/travis-web/blob/master/ember-cli-build.js
    var app = new EmberApp(defaults, {
        sourcemaps: {
            enabled: true,
            extensions: ['js']
        },
        vendorFiles: {
            // next line is needed to prevent ember-cli to load
            // handlebars (it happens automatically in 0.1.x)
            'handlebars.js': {production: null},
            [useCdn ? 'ember.js' : '']: false,
            [useCdn ? 'jquery.js' : '']: false,
        },
        'ember-bootstrap': {
            importBootstrapCSS: false
        },
        // Needed for branded themes
        fingerprint: {
            customHash: config.ASSET_SUFFIX,
        },
        outputPaths: {
            app: {
                css
            }
        },
        sassOptions: {
            includePaths: [
                'node_modules/@centerforopenscience/ember-osf/addon/styles',
                'node_modules/@centerforopenscience/osf-style/sass',
                'node_modules/hint.css'
            ]
        },
        inlineContent: {
            raven: {
                enabled: useCdn,
                content: `
                    <script src="https://cdn.ravenjs.com/3.5.1/ember/raven.min.js"></script>
                    <script>
                        var encodedConfig = document.head.querySelector("meta[name$='/config/environment']").content;
                        var config = JSON.parse(unescape(encodedConfig));
                        Raven.config(config.sentryDSN, {}).install();
                    </script>
                `.trim()
            },
            cdn: {
                enabled: useCdn,
                content: `
                    <script src="//cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>
                    <script src="//cdnjs.cloudflare.com/ajax/libs/ember.js/2.18.0/ember.prod.js"></script>
                `.trim()
            },
        },
        postcssOptions: {
            compile: {
                enabled: false
            },
            filter: {
                enabled: true,
                plugins: [{
                    module: require('autoprefixer'),
                    options: {
                        browsers: ['last 4 versions'],
                        cascade: false
                    }
                }, {
                    // Wrap progid declarations with double-quotes
                    module: require('postcss').plugin('progid-wrapper', () => {
                        return css =>
                            css.walkDecls(declaration => {
                                if (declaration.value.startsWith('progid')) {
                                    return declaration.value = `"${declaration.value}"`;
                                }
                            });
                    })
                }]
            }
        },
        // bable options included to fix issue with testing discover controller
        // http://stackoverflow.com/questions/32231773/ember-tests-passing-in-chrome-not-in-phantomjs
        babel: {
            optional: ['es6.spec.symbols'],
            includePolyfill: true
        },
    });

    // Use `app.import` to add additional libraries to the generated
    // output files.
    //
    // If you need to use different assets in different
    // environments, specify an object as the first parameter. That
    // object's keys should be the environment name and the values
    // should be the asset to use in that environment.
    //
    // If the library that you are including contains AMD or ES6
    // modules that you would like to import into your application
    // please specify an object with the list of modules as keys
    // along with the exports of each module as its value.

    // osf-style
    
    // Import component styles from addon
    app.import('vendor/assets/ember-osf.css');

    const assets = [
        new Funnel('node_modules/@centerforopenscience/osf-style/img', {
            srcDir: '/',
            destDir: 'img',
        })
    ];

    return app.toTree(assets);
};
