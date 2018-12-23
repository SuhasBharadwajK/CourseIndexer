"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var axios_1 = require("axios");
var DB = require("documentdb-typescript");
var fs = require("fs");
// set NODE_TLS_REJECT_UNAUTHORIZED = 0
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
var baseUrl = 'https://community.toppr.com';
var apiResource = 'content/topics/get_lo_tree/';
var config = {};
config.endpoint = "https://localhost:8081/";
config.primaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";
config.database = {
    "id": "Course"
};
config.container = {
    "id": "Chapters"
};
var client = new DB.Client(config.endpoint, config.primaryKey);
var subjects = [];
var main = function () {
    // getSubjects();
    // saveDocument(null);
    // getChaptersFromSubject(new CourseItem({
    //     "topic_name": "Physics",
    //     "score": 17.292248,
    //     "topic_pk": 3552
    // }));
    getChapterDocuments(3552);
};
// var getSubjects = () => {
//     sendGetRequest(apiResource, { "get_subjects" : true }).then(response => {
//         if (response.data && response.data.subjects && response.data.subjects.length) {
//             subjects = response.data.subjects.map(s => new CourseItem(s));
//             console.log("Subjects: " + subjects.map(d => d.name).join(","));
//             subjects.forEach(subject => {
//                 setTimeout(() => {
//                     saveDocument(subject);
//                     getChaptersFromSubject(subject);
//                 }, 2000)
//             });
//         }
//     })
// }
var getChaptersFromSubject = function (subject) {
    //Get chapters from subject
    console.log(subject.name);
    setTimeout(function () {
        sendGetRequest(apiResource, { "subject_id": subject.itemId }).then(function (response) {
            if (response.data && response.data.chapters && response.data.chapters.length) {
                var chapters = response.data.chapters.map(function (c) { return new CourseItem(c, subject.itemId, CourseItemType.Chapter); });
                console.log("Chapters in: " + subject.name + " are " + chapters.map(function (d) { return d.name; }).join(","));
                // subject.children = chapters;
                chapters.forEach(function (chapter) {
                    setTimeout(function () {
                        saveDocument(chapter);
                        getSectionsFromChapter(chapter);
                    }, 2000);
                });
            }
        });
    }, 5000);
};
var getSectionsFromChapter = function (chapter) {
    //Get sections from chapter
    console.log("\t" + chapter.name);
    setTimeout(function () {
        sendGetRequest(apiResource, { "chapter_id": chapter.itemId }).then(function (response) {
            if (response.data && response.data.sections && response.data.sections.length) {
                var sections = response.data.sections.map(function (s) { return new CourseItem(s, chapter.itemId, CourseItemType.Section); });
                console.log("\tSections in: " + chapter.name + " are " + sections.map(function (d) { return d.name; }).join(","));
                // chapter.children = sections;
                sections.forEach(function (section) {
                    setTimeout(function () {
                        saveDocument(section);
                        getLOsFromSection(section);
                    }, 2000);
                });
            }
        });
    }, 5000);
};
var getLOsFromSection = function (section) {
    //Get LOs from Section
    console.log("\t\t" + section.name);
    setTimeout(function () {
        sendGetRequest(apiResource, { "section_id": section.itemId }).then(function (response) {
            if (response.data && response.data.los && response.data.los.length) {
                var los = response.data.los.map(function (lo) { return new CourseItem(lo, section.itemId, CourseItemType.LO); });
                console.log("\t\tLOs in: " + section.name + " are " + los.map(function (d) { return d.name; }).join(","));
                // section.children = los;
                los.forEach(function (lo) {
                    setTimeout(function () {
                        saveDocument(lo);
                    }, 2000);
                });
            }
        });
    }, 5000);
};
var sendGetRequest = function (resourceUrl, params) {
    var requestConfig = {};
    if (params != null) {
        requestConfig.params = params;
    }
    return axios_1.default.get(baseUrl + "/" + resourceUrl, requestConfig);
};
var saveDocument = function (document) {
    var coll = new DB.Collection("Chapters", "Course", client);
    coll.storeDocumentAsync(document, DB.StoreMode.CreateOnly).then(function (data) {
    });
    // coll.openOrCreateDatabaseAsync().then(collection => {
    // });
};
var getChapterDocuments = function (subjectId) {
    var coll = new DB.Collection("Chapters", "Course", client);
    var query = "SELECT c.id, c.name, c.score, c.parentId FROM c";
    client.openAsync().then(function () {
        var collectionLink = "dbs/Course/colls/Chapters";
        client.documentClient.queryDocuments(collectionLink, query, { enableCrossPartitionQuery: true }).toArray(function (error, list) {
            var allItems = list.map(function (l) { return new CourseItem(l); });
            organizeItems(allItems, subjectId);
            console.log(allItems);
        });
    });
};
var organizeItems = function (list, subjectId) {
    var chapters = list.filter(function (l) { return l.parentId == subjectId; });
    chapters.forEach(function (chapter) {
        var sections = list.filter(function (l) { return l.parentId == chapter.itemId; });
        chapter.children = sections;
        chapter.children.forEach(function (section) {
            var los = list.filter(function (l) { return l.parentId == section.itemId; });
            section.children = los;
        });
    });
    // chapters = chapters.sort((a, b) => {
    // });
    writeToText(chapters);
    writeToJson(chapters);
};
var writeToText = function (chapters) {
    var text = '';
    for (var i = 0; i < chapters.length; i++) {
        var chapter = chapters[i];
        text += i + 1 + " " + chapter.name + "\n";
        for (var j = 0; j < chapter.children.length; j++) {
            var section = chapter.children[j];
            text += "...." + (i + 1) + "." + (j + 1) + " " + section.name + "\n";
            for (var k = 0; k < section.children.length; k++) {
                var lo = section.children[k];
                text += "........" + (i + 1) + "." + (j + 1) + "." + (k + 1) + " " + lo.name + "\n";
            }
            text += "\n";
        }
        text += "\n\n";
    }
    text += "\n";
    fs.writeFile("chapters.txt", text, function (err) {
        if (err) {
            console.log("An error occurred!");
            console.log(err);
        }
        else {
            console.log("The file was saved");
        }
    });
};
var writeToJson = function (chapters) {
    var text = "[\n\t{\n";
    for (var i = 0; i < chapters.length; i++) {
        var chapter = chapters[i];
        text += "\t\t\"" + chapter.name + "\" : [\n\t\t\t{\n";
        for (var j = 0; j < chapter.children.length; j++) {
            var section = chapter.children[j];
            text += "\t\t\t\t\"" + section.name + "\" : [\n";
            for (var k = 0; k < section.children.length; k++) {
                var lo = section.children[k];
                var loName = lo.name.replace(/\"/g, "'");
                text += "\t\t\t\t\t\"" + loName + "\"" + (k != section.children.length - 1 ? "," : "") + "\n";
            }
            text += "\t\t\t\t]" + (j != chapter.children.length - 1 ? "," : "") + "\n";
        }
        text += "\t\t\t}\n\t\t]" + (i != chapters.length - 1 ? "," : "") + "\n";
    }
    text += "\t}\n]";
    fs.writeFile("chapters.json", text, function (err) {
        if (err) {
            console.log("An error occurred!");
            console.log(err);
        }
        else {
            console.log("The file was saved");
        }
    });
};
var CourseItem = /** @class */ (function () {
    function CourseItem(args, parentId, type) {
        if (args === void 0) { args = {}; }
        if (parentId === void 0) { parentId = null; }
        if (type === void 0) { type = null; }
        this.score = args.score;
        this.itemId = args.id || args.topic_pk || args.lo_pk;
        this.name = args.name || args.topic_name || args.lo_name;
        this.parentId = args.parentId;
        this.type = type || CourseItemType.Subject;
    }
    Object.defineProperty(CourseItem.prototype, "itemId", {
        get: function () {
            return parseInt(this.id, 10);
        },
        set: function (value) {
            this.id = "" + value;
        },
        enumerable: true,
        configurable: true
    });
    ;
    return CourseItem;
}());
var CourseItemType;
(function (CourseItemType) {
    CourseItemType[CourseItemType["Subject"] = 0] = "Subject";
    CourseItemType[CourseItemType["Chapter"] = 1] = "Chapter";
    CourseItemType[CourseItemType["Section"] = 2] = "Section";
    CourseItemType[CourseItemType["LO"] = 3] = "LO";
})(CourseItemType || (CourseItemType = {}));
main();
//# sourceMappingURL=app.js.map