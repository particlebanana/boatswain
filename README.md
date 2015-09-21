# Experimental Sails.js bot


This is a work in progress.


## Usage

First, clone this repo, then `cd` on in and run `npm install`.

To automatically close the 3 stalest issues in one or more repos, run:
```bash
$ ___repos='[{"owner": "your-github-username", "repoName": "name-of-the-repo"}]' ___credentials='{"accessToken": "github_personal_access_token_goes_here"}' node bin/close-some-stale-issues.js
```


And you'll see something like:

```
Located at least 100 old, open issues...
...and closing the 3 oldest ones.
Done!
```


## License
MIT
