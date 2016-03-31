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
  let repoPromise = new Promise((resolve, reject) => {
    github.repos.getForUser(
      {user: who},
      (err, res) => {
        followPages(resolve, reject, [], res);
    });
  });

  return repoPromise
    .then(extractPackages)
    .then(v => {
      console.log(JSON.stringify(v, null, '  '));
      return v;
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

function extractPackages(repos) {
  return Promise.map(repos, r => {
    return Promise.props({
      repoName: r.full_name,
      dependencies: fetchDeps(r).then(fetchDetailsFromDeps)
    });
  });
}

function fetchDeps(repo) {
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

function fetchDetailsFromDeps(deps) {
  return Promise.map(deps, dep => {
    return Promise.props({
      name: dep,
      licenses: fetchLicense(dep),
      description: fetchDescription(dep)
    });
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
  });
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
  });
}

module.exports = {
  authenticate: authenticate,
  fetchRepos: fetchRepos
};
