# license-to-thrill

![goldeneye?](https://media.giphy.com/media/iu63aOVVFspQQ/giphy.gif)

A command line application to enumerate and output the licenses of all the NPM packages for all the repos of any GitHub user.
(Lawyers require this information to perform their arcane and eldritch incantations.)

# Installation

`$ npm install -g license-to-thrill`

# Usage

`license-to-thrill` outputs its results to stdout, and accepts GitHub credentials and target user as arguments. If an argument is missing, a fallback interactive prompt is provided.

See https://github.com/settings/tokens to create a token.  Check only the '**repo**' group of permissions. _You can use your GitHub password as a token but I really don't recommend this! Creating a token is easy!_

![check repo only](http://i.imgur.com/PXigvmQ.png)

- `$ license-to-thrill -u <github username> -p <github token> -w [github target user]`
- `$ license-to-thrill [...] > licenseData.json`

# TODO

- currently, l-t-t only looks in the root directory of a user's repos for a `package.json`. this can obviously be improved...
- including other language's dependency lists? scary.
- devDependencies?

# Licensing

This project is licensed under the terms of the Apache 2 license.
