'use strict';

const fs = require('fs');
const _ = require('lodash');

let deps = JSON.parse(fs.readFileSync('licenses.json', 'utf-8'));

let filtered = _(deps)
  .filter(d => (d.licenses || d.description))
  .sortBy('name')
  .value();

console.log(JSON.stringify(filtered, null, '  '));
