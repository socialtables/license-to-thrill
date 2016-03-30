# license-to-thrill

![goldeneye?](https://media.giphy.com/media/iu63aOVVFspQQ/giphy.gif)

A command line application to enumerate and output all the licenses of all the packages of any GitHub user.
(Lawyers require this information to perform their arcane and eldritch incantations.)

# Installation

`$ npm install -g license-to-thrill`

# Usage

`license-to-thrill` outputs its results to stdout, and accepts GitHub credentials and target user as arguments. If an argument is missing, a fallback interactive prompt is provided.

See https://github.com/settings/tokens to create a token. Leave all permissions unchecked. _You can use your GitHub password as a token but I really don't recommend this! Create a token is easy!_

- `$ license-to-thrill -u <github username> -p <github token> -w [github target user]`
- `$ license-to-thrill [...] > licenseData.json`
