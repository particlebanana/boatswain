/**
 * Module dependencies
 */

var _ = require('lodash');
var async = require('async');
var Github = require('machinepack-github');



// CONSTANTS
var MAX_NUM_ISSUES_TO_CLOSE = 1;
var REPOS = [{
  owner: 'balderdashy',
  repoName: 'sails'
}];
var COMMENT_TEMPLATE = _.template(
  'Thanks for posting, @<%= user.login %>.  I\'m an experimental issue cleanup bot-- nice to meet you!'+
  '\n'+
  '\n'+
  'It has been a couple of months since there have been any updates or new comments on this page.  If this issue has been resolved, please feel free to disregard the rest of this message.  '+
  'On the other hand, if you are still waiting on a patch, please:\n\n'+
  '  + review our [contribution guide](https://github.com/balderdashy/sails/blob/master/CONTRIBUTING.md) to make sure this submission meets our criteria (only _verified bugs_ with documented features, please;  no questions, commentary, or bug reports about undocumented features or unofficial plugins)'+
  '\n'+
  '  + create a new issue with the latest information, including updated version details with error messages, failing tests, etc.  Please include a link back to this page for reference.'+
  '\n'+
  '  + add a comment to _this_ issue with a link to the new issue (for people arriving from search engines)'+
  '\n\n'+
  'Thanks so much for your help!\n\n'+
  '<3\n'+
  'Sails.js proto-bot'
);

var CREDENTIALS = {
  accessToken: process.env.ACCESS_TOKEN
};





// Construct a JS timestamp that represents two months ago today.
var twoMonthsAgo = (new Date()).getTime() - 5184000000;

// hack:TODO: remove
twoMonthsAgo = (new Date()).getTime()+ 100000000;

// For each repo...
async.each(REPOS, function (repo, next){

  // Fetch up to `MAX_NUM_ISSUES_TO_CLOSE` of the oldest open issues in the repo.
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

      // Only use the first `MAX_NUM_ISSUES_TO_CLOSE` issues
      // (chop off any extras from the end of the array)
      oldIssues = oldIssues.slice(0, MAX_NUM_ISSUES_TO_CLOSE);

      // For each old issue...
      async.each(oldIssues, function (oldIssue, next){

        // Post a comment on the issue explaining what's happening.
        Github.commentOnIssue({
          owner: repo.owner,
          repo: repo.repoName,
          issueNumber: oldIssue.number,
          comment: COMMENT_TEMPLATE(oldIssue),
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

