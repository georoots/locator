'use strict';

const path = require('path');
const { writeExports } = require('./extract-i18n-lib.js');

writeExports({
    html: path.join(__dirname, '..', 'index.html'),
    format: 'locator',
    dataVar: 'I18N_LOCATOR_DATA',
});
