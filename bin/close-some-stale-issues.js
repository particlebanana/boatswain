#!/usr/bin/env node

require('machine-as-script')({

  machine: {


    friendlyName: 'Close some stale issues',


    description: '',


    inputs: {


    },


    fn: function (inputs, exits) {
      var _ = require('lodash');
      var async = require('async');
      var Github = require('machinepack-github');

      return exits.success();
    }


  },

  envVarNamespace: 'add_numbers__'

}).exec({
  success: function (sum){


    console.log('Got result:', sum);
  }
});


return;


// The maximum number of issues to close in any one repo as a result
// of running this script one time. Currently, this must be <= 100
// (because the page size of issue search results from the GitHub API is 100,
//  and we don't currently handle multiple pages of results in this module)
//
// Defaults to 3.
var MAX_NUM_ISSUES_TO_CLOSE_PER_REPO = rttc.parseHuman(
  process.env.MAX_NUM_ISSUES_TO_CLOSE_PER_REPO || '3',
  'number'
);



// A set of repos that will be processed.
var REPOS = rttc.parseHuman(
  process.env.repos || [],
  [
    {
      owner: 'string',
      repoName: 'string'
    }
  ]
);


// The string template for the comment that will be posted by this bot
// as the issue is closed.  It supports lodash template notation, and is
// provided with the raw issue dictionary from the GitHub API as `issue` on
// its scope, as well as repo info provided as `repo`.
//
// By default, this is a reasonable message.
var COMMENT_TEMPLATE = rttc.validate('string',
  process.env.COMMENT_TEMPLATE ||
  'Thanks for posting, @<%- issue.user.login %>.  I\'m an experimental issue cleanup bot-- nice to meet you!'+
  '\n'+
  '\n'+
  'It has been a couple of months since there have been any updates or new comments on this page.  If this issue has been resolved, please feel free to disregard the rest of this message.  '+
  'On the other hand, if you are still waiting on a patch, please:\n\n'+
  '  + review our [contribution guide](https://github.com/<%-repo.owner%>/<%-repo.repoName%>/blob/master/CONTRIBUTING.md) to make sure this submission meets our criteria (only _verified bugs_ with documented features, please;  no questions, commentary, or bug reports about undocumented features or unofficial plugins)'+
  '\n'+
  '  + create a new issue with the latest information, including updated version details with error messages, failing tests, etc.  Please include a link back to this page for reference.'+
  '\n'+
  '  + add a comment to _this_ issue with a link to the new issue (for people arriving from search engines)'+
  '\n\n'+
  'Thanks so much for your help!\n\n'+
  '<3\n'+
  '<%- repo.repoName %>-bot'
);
// Note that we convert it into a precompiled function using `_.template()`.
COMMENT_TEMPLATE = _.template(COMMENT_TEMPLATE);


// The credentials that the bot will use to make authenticated requests
// to the GitHub API.  Either `accessToken`, `clientId`+`clientSecret`,
// or `username`+`password` keys may be provided.
// (required)
var CREDENTIALS = rttc.parseHuman(CREDENTIALS, {});

console.log(CREDENTIALS);
return;



// Construct a JS timestamp that represents two months ago today.
var twoMonthsAgo = (new Date()).getTime() - 5184000000;

// hack:TODO: remove
twoMonthsAgo = (new Date()).getTime()+ 100000000;

// For each repo...
async.each(REPOS, function (repo, next){

  // Fetch up to `MAX_NUM_ISSUES_TO_CLOSE_PER_REPO` of the oldest open issues in the repo.
  Github.searchIssues({
    owner: repo.owner,
    repo: repo.repoName,
    state: 'open',
    lastUpdatedBefore: twoMonthsAgo,
    credentials: CREDENTIALS,
  }).exec({
    error: function (err) {
      // If an error was encountered, keep going, but log it to the console.
      console.error('ERROR: Failed to search issues in repo ("'+repo.repoName+'")\n',err);
      return next();
    },
    success: function (oldIssues){
      console.log('Located at least %d old, open issues...',oldIssues.length);

      // Only use the first `MAX_NUM_ISSUES_TO_CLOSE_PER_REPO` issues
      // (chop off any extras from the end of the array)
      oldIssues = oldIssues.slice(0, MAX_NUM_ISSUES_TO_CLOSE_PER_REPO);

      // For each old issue...
      async.each(oldIssues, function (oldIssue, next){

        // Post a comment on the issue explaining what's happening.
        Github.commentOnIssue({
          owner: repo.owner,
          repo: repo.repoName,
          issueNumber: oldIssue.number,
          comment: COMMENT_TEMPLATE({
            repo: repo,
            issue: oldIssue
          }),
          credentials: CREDENTIALS,
        }).exec({
          error: function (err){
            // If an error was encountered, keep going, but log it to the console.
            console.error('ERROR: Failed to comment on issue #'+oldIssue.number+':\n',err);
            return next();
          },
          success: function (newCommentId){

            // Now close the issue.
            Github.closeIssue({
              owner: repo.owner,
              repo: repo.repoName,
              issueNumber: oldIssue.number,
              credentials: CREDENTIALS,
            }).exec({
              error: function (err){
                // If an error was encountered, keep going, but log it to the console.
                console.error('ERROR: Failed to close issue #'+oldIssue.number+':\n',err);
                return next();
              },
              success: function (){
                return next();
              }
            }); // </Github.closeIssue>
          }
        });//</Github.commentOnIssue>

      }, function afterwards(err){
        // If a fatal error was encountered processing this repo, bail.
        // Otherwise, keep going.
        return next(err);
      }); //</async.each>
    }
  }); // </Github.searchIssues>

}, function afterwards(err) {
  if (err) {
    console.error('Script failed w/ fatal error:', err);
    return;
  }

  console.log('Done.');
}); //</async.each>

