import axios from 'axios'
import { AxiosRequestConfig } from 'axios';
import * as DB from "documentdb-typescript";
import * as fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

var baseUrl = '<baseUrl>';
var apiResource = '<resourceUrl>';

var config: any = {}

config.endpoint = "https://localhost:8081/";
config.primaryKey = "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==";

config.database = {
   "id": "Course"
};

config.container = {
  "id": "Chapters"
};

const client = new DB.Client(config.endpoint, config.primaryKey);

let subjects: CourseItem[] = [];

var main = () => {
    // This is for getting subjects. And then getting chapters in each subject.
    // This is extremely taxing on the server due to the sheer number of records.
    // getSubjects();
    
    // Get chapters from only the given subject.
    // getChaptersFromSubject(new CourseItem({
    //     "topic_name": "Physics",
    //     "score": 17.292248,
    //     "topic_pk": 3552
    // }));

    // Get the documents and write the content to the files.
    getDocumentsAndWriteToFiles(3552);
}

var getSubjects = () => {
    sendGetRequest(apiResource, { "get_subjects" : true }).then(response => {
        if (response.data && response.data.subjects && response.data.subjects.length) {
            subjects = response.data.subjects.map(s => new CourseItem(s));
            console.log("Subjects: " + subjects.map(d => d.name).join(","));
            subjects.forEach(subject => {
                setTimeout(() => {
                    saveDocument(subject);
                    getChaptersFromSubject(subject);
                }, 2000)
            });
        }
    })
}

var getChaptersFromSubject = (subject: CourseItem) => {
    //Get chapters from subject
    console.log(subject.name);
    setTimeout(() => {
        sendGetRequest(apiResource, { "subject_id" : subject.itemId }).then(response => {
            if (response.data && response.data.chapters && response.data.chapters.length) {
                var chapters = response.data.chapters.map(c => new CourseItem(c, subject.itemId, CourseItemType.Chapter));
                console.log(`Chapters in: ${subject.name} are ${chapters.map(d => d.name).join(",")}`);
                // subject.children = chapters;
                chapters.forEach(chapter => {
                    setTimeout(() => {
                        saveDocument(chapter);
                        getSectionsFromChapter(chapter);
                    }, 2000)
                });
            }
        });
    }, 5000);
}

var getSectionsFromChapter = (chapter: CourseItem) => { 
    //Get sections from chapter
    console.log(`\t${chapter.name}`)
    setTimeout(() => {
        sendGetRequest(apiResource, { "chapter_id" : chapter.itemId }).then(response => {
            if (response.data && response.data.sections && response.data.sections.length) {
                var sections = response.data.sections.map(s => new CourseItem(s, chapter.itemId, CourseItemType.Section));
                console.log(`\tSections in: ${chapter.name} are ${sections.map(d => d.name).join(",")}`);
                // chapter.children = sections;
                sections.forEach(section => {
                    setTimeout(() => {
                        saveDocument(section);
                        getLOsFromSection(section);
                    }, 2000);
                });
            }
        });
    }, 5000);
}

var getLOsFromSection = (section: CourseItem) => {
    //Get LOs from Section
    console.log(`\t\t${section.name}`)
    setTimeout(() => {
        sendGetRequest(apiResource, { "section_id" : section.itemId }).then(response => {
            if (response.data && response.data.los && response.data.los.length) {
                var los = response.data.los.map(lo => new CourseItem(lo, section.itemId, CourseItemType.LO));
                console.log(`\t\tLOs in: ${section.name} are ${los.map(d => d.name).join(",")}`);
                // section.children = los;
                los.forEach(lo => {
                    setTimeout(() => {
                        saveDocument(lo);
                    }, 2000);
                });
            }
        });
    }, 5000);

}

var sendGetRequest = (resourceUrl: string, params?: any) => {
    let requestConfig : AxiosRequestConfig = { };
    if (params != null) {
        requestConfig.params = params;
    }

    return axios.get(`${baseUrl}/${resourceUrl}`, requestConfig);
}

var saveDocument = (document: CourseItem) =>  {
    var coll = new DB.Collection("Chapters", "Course", client);
    coll.openOrCreateDatabaseAsync().then(collection => {
        coll.storeDocumentAsync(document, DB.StoreMode.CreateOnly).then(data => {
        });
    });
}

var getDocumentsAndWriteToFiles = (subjectId: number) => {
    var query = `SELECT c.id, c.name, c.score, c.parentId FROM c`;
    client.openAsync().then(() => {
        var collectionLink = `dbs/Course/colls/Chapters`;
        client.documentClient.queryDocuments(collectionLink, query, { enableCrossPartitionQuery: true }).toArray((error, list) => {
            var allItems = list.map(l => new CourseItem(l));
            organizeItems(allItems, subjectId);
            console.log(allItems);
        });
    })
}

var organizeItems = (list: CourseItem[], subjectId: number) => {
    var chapters = list.filter(l => l.parentId == subjectId);
    chapters.forEach(chapter => {
        var sections = list.filter(l => l.parentId == chapter.itemId);
        chapter.children = sections;
        chapter.children.forEach(section => {
            var los = list.filter(l => l.parentId == section.itemId);
            section.children = los;
        });
    });

    writeToText(chapters);
    writeToJson(chapters);
}

var writeToText = (chapters: CourseItem[]) => {
    var text = '';
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        text += `${i + 1} ${chapter.name}\n`;

        for (let j = 0; j < chapter.children.length; j++) {
            const section = chapter.children[j];
            text += `....${i + 1}.${j + 1} ${section.name}\n`;

            for (let k = 0; k < section.children.length; k++) {
                const lo = section.children[k];
                text += `........${i + 1}.${j + 1}.${k + 1} ${lo.name}\n`;            
            }

            text += "\n";
        }

        text += "\n\n";
    }

    text += "\n";

    fs.writeFile("chapters.txt", text, (err) => {
        if (err) {
            console.log("An error occurred!");
            console.log(err);
        }
        else {
            console.log("The file was saved");
        }
    });
}

var writeToJson = (chapters: CourseItem[]) => {
    var text = "[\n\t{\n";
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        text += `\t\t"${chapter.name}" : [\n\t\t\t{\n`;

        for (let j = 0; j < chapter.children.length; j++) {
            const section = chapter.children[j];
            
            text += `\t\t\t\t"${section.name}" : [\n`;

            for (let k = 0; k < section.children.length; k++) {
                const lo = section.children[k];
                var loName = lo.name.replace(/\"/g, "'");
                text += `\t\t\t\t\t"${loName}"${ k != section.children.length - 1 ? "," : ""}\n`;
            }
            
            text += `\t\t\t\t]${ j != chapter.children.length - 1 ? "," : "" }\n`;
        }

        text += `\t\t\t}\n\t\t]${ i != chapters.length - 1 ? "," : "" }\n`;
    }

    text += "\t}\n]";

    fs.writeFile("chapters.json", text, (err) => {
        if (err) {
            console.log("An error occurred!");
            console.log(err);
        }
        else {
            console.log("The file was saved");
        }
    });
}

class CourseItem {
    public score: string;
    public id: string;
    public name: string;
    public parentId: number;
    public children: CourseItem[];
    public type: CourseItemType;

    public get itemId() {
        return parseInt(this.id, 10);
    };

    public set itemId(value: number) {
        this.id = `${value}`;
    }

    constructor(args: any = {}, parentId: number = null, type: CourseItemType = null) {
        this.score = args.score;
        this.itemId = args.id || args.topic_pk || args.lo_pk;
        this.name = args.name || args.topic_name || args.lo_name;
        this.parentId = args.parentId;
        this.type = type || CourseItemType.Subject;
    }
}

enum CourseItemType {
    Subject,
    Chapter,
    Section,
    LO
}

main();