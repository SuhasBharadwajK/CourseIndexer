"use strict";
exports.__esModule = true;
var axios_1 = require("axios");
var baseUrl = 'https://community.toppr.com';
var pageResource = 'content/projects/job/72083/list_questions/open/';
var apiResource = 'content/topics/get_lo_tree/';
var subjectId = 3552;
var main = function () {
    getSubjectsFromPage();
};
var getPage = function () {
    //GET page HTML
};
var getSubjectsFromPage = function () {
    //Parse DOM and get subject IDs
    sendGetRequest(pageResource);
};
var getChaptersFromSubject = function () {
    //
};
var getSectionsFromChapter = function () {
    //
};
var getLOsFromSection = function () {
    //
};
var sendGetRequest = function (resourceUrl, params) {
    var requestConfig = {};
    if (params != null) {
        requestConfig.params = params;
    }
    axios_1["default"].get(baseUrl + "/" + resourceUrl, requestConfig).then(function (response) {
        console.log(response);
        if (response.status == 200) {
            // searchResults = response.data;
            // orgRepos = response.data.items.map(i => new OrgRepo(i));
            // orgRepos.forEach(element => {
            //     axios.get(element.contributors_url + '?per_page=' + maxContributors, getOptions).then(resp => {
            //         element.topContributors = resp.data.map(d => new Contributor(d));
            //         fetchedOrgs++;
            //     }, error => {
            //         console.log(error);
            //     });
            // });
        }
    }, function (error) {
        console.log('An error has occurred!');
    });
};
main();
