#!/usr/bin/env node
'use strict';

const packageInfo = require('package-info');
const githubAPI = require('github4');
const licenses = require('licenses');
const program = require('commander');
const Promise = require('bluebird');
const prompt = require('prompt');
const envs = require('envs');
const _ = require('lodash');

let github = new githubAPI({debug: envs('NODE_ENV') === 'development'});

program
  .version('0.0.2');

program
  .usage('-u <github username> -p <github token> -w [github target user]')
  .option('-u, --username <u>', 'Your GitHub username or email')
  .option('-t, --token <t>', 'A GitHub personal access token')
  .option('-w, --who <w>', 'Github username of the user to enumerate')
  .option('--combined-unique', 'Combine and de-dupe all repos dependencies')
  .on('--help', () => {
    console.log("  See https://github.com/settings/tokens to create a token.");
    console.log("  Leave all permissions unchecked.");
  })
  .parse(process.argv);

if (program.username && program.token && program.who) {
  authenticate(program.username, program.token);
  fetchRepos(program.who);
} else {
  promptForArguments();
}

function promptForArguments() {
  const schema = {
   properties: {
     username: {
       required: true,
       default: program.username,
       description: 'GitHub username or email'
     },
     token: {
       required: true,
       default: program.token,
       description: 'Github personal access token'
     },
     who: {
       required: true,
       default: 'socialtables',
       description: 'Github username of the user to enumerate'
     }
   }
 };

  prompt.start();
  prompt.get(schema, (err, res) => {
    authenticate(res.username, res.token);
    fetchRepos(res.who);
  });
}

function authenticate(username, token) {
  github.authenticate({
    type: 'basic',
    username: username,
    password: token
  });
}

function fetchRepos(who) {
  let userPromise = new Promise((resolve, reject) => {
    github.repos.getForUser(
      {user: who, per_page: 100},
      (err, res) => {
        followPages(resolve, reject, [], res);
    });
  });

  let orgPromise = new Promise((resolve, reject) => {
    github.repos.getForOrg(
      {org: who, per_page: 100},
      (err, res) => {
        followPages(resolve, reject, [], res);
    });
  });

  return Promise.all([userPromise, orgPromise])
    .then(userAndOrgRepos => _.flatten(userAndOrgRepos))
    .then(extractDepsFromPackages)
    .then(dedupeAndFetchDeps)
    .then(allData => {
      if (program.combinedUnique) {
        allData = _(allData)
          .map('dependencies')
          .reject(_.isEmpty)
          .flatten()
          .uniqBy('name')
          .value();
      }
      console.log(JSON.stringify(allData, null, '  '));
      return allData;
    });
}

function followPages(resolve, reject, repos, res) {
  repos = repos.concat(res);

  if (github.hasNextPage(res)) {
    github.getNextPage(
      res,
      (err, newRes) => followPages(resolve, reject, repos, newRes)
    );
  } else {
    resolve(repos);
  }
}

function extractDepsFromPackages(repos) {
  return Promise.map(repos, r => {
    return Promise.props({
      repoName: r.full_name,
      dependencies: fetchDepsFromRepo(r)
    });
  });
}

function fetchDepsFromRepo(repo) {
  return new Promise((resolve, reject) => {
    github.repos.getContent({
      user: repo.owner.login,
      repo: repo.name,
      path: 'package.json',
    }, (err, res) => {
      if (err) {
        if (err.code === 404) {
          resolve([]);
        } else {
          reject(err);
        }
      } else {
        let packageStr = new Buffer(res.content, 'base64').toString();
        let thePackage = JSON.parse(packageStr);
        let deps = _(thePackage.dependencies)
          .keys()
          .map(d => d.toLowerCase())
          .value();
        resolve(deps);
      }
    });
  });
}

function dedupeAndFetchDeps(repos) {
  let uniqDeps = _(repos)
    .flatMap('dependencies')
    .uniq()
    .value();

  return Promise.map(uniqDeps, fetchDetailsFromDep, {concurrency: 3})
    .then(assignDepsToRepos);

  function assignDepsToRepos(detailedDeps) {
    let depsMap = _.keyBy(detailedDeps, 'name');
    return repos.map(r => _.extend(r, {
      dependencies: r.dependencies.map(d => depsMap[d])
    }));
  }
}

function fetchDetailsFromDep(dep) {
  return Promise.props({
    name: dep,
    licenses: fetchLicense(dep),
    description: fetchDescription(dep)
  });
}

function fetchLicense(dep) {
  return new Promise((resolve, reject) => {
    licenses(dep, (err, license) => {
      if (err) {
        reject(err);
      } else {
        resolve(license);
      }
    });
  }).catch(console.error);
}

function fetchDescription(dep) {
  return new Promise((resolve, reject) => {
    packageInfo(dep, (err, info) => {
      if (err) {
        reject(err);
      } else {
        resolve(info.description);
      }
    })
  }).catch(console.error);
}

module.exports = {
  authenticate: authenticate,
  fetchRepos: fetchRepos
};
