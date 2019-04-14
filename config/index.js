/**
 * Created by kras on 09.07.16.
 */
'use strict';

const read = require('lib/config-reader');
const config = require('./config.json');
const path = require('path');

module.exports = read(config, [path.normalize(path.join(__dirname, '..', '..', '..', 'config')), __dirname]);

