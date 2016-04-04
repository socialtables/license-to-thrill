'use strict';

const fs = require('fs');
const _ = require('lodash');

let deps = JSON.parse(fs.readFileSync('dependencies.json', 'utf-8'));
_(deps)
  .sortBy('name')
  .forEach(d => {
    console.log('name: ' + d.name);
    if (d.description) { console.log('description: ' + d.description); }
    if (d.homepage) { console.log('homepage: ' + d.homepage); }
    if (d.author) { console.log('author: ' + d.author); }
    if (d.licenses) { console.log('licenses: ' + d.licenses.join(', ')); }
    console.log();
  });
