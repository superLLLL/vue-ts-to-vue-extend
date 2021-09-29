const fs = require('fs');
const vueCompiler = require('vue-template-compiler');
const getParseFile = require('./tanslate');

function readFileList(path, filesList) {
    var files = fs.readdirSync(path);
    files.forEach(function (itm, index) {
        var stat = fs.statSync(path + itm);
        if (itm.includes('.') && itm.slice(-3) !== 'vue') {
            return;
        }
        if (stat.isDirectory()) {
            //递归读取文件
            readFileList(path + itm + '/', filesList);
        } else {
            var obj = {}; //定义一个对象存放文件的路径和名字
            obj.path = path; //路径
            obj.filename = itm; //名字
            filesList.push(obj);
        }
    });
}
class getFiles {
    filesList = [];
    constructor(path) {
        this.path = path;
    }

    getFileList() {
        return this.filesList;
    }

    setFileList() {
        readFileList(this.path, this.filesList);
    }

    async paurseEachFile() {
        this.setFileList();
        for (let index = 0; index < this.filesList.length; index++) {
            const element = this.filesList[index];
            const pathName = element.path + element.filename;
            let fileContent = fs.readFileSync(pathName, 'utf8');
            const { template, script } = vueCompiler.parseComponent(fileContent);
            if (script.attrs.lang !== 'ts') {
                continue;
            }
            console.log(element.filename);
            let scriptContext = await getParseFile(script.content);
            let fullContext =
                fileContent.slice(0, template.end + 11) + '\n' + scriptContext + fileContent.slice(script.end + 10);
            fs.writeFileSync(pathName, fullContext);
        }
    }
}

const translateFile = new getFiles(`D:/my-work/web-auth-corp/enterprise-desktop/src/`);
translateFile.paurseEachFile();
