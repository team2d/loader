const server = require('./server')
const fs = require('fs')
const path = require('path')
const extract = require('extract-zip')
const { exec } = require('child_process');
const request = require('request');
let extLoad = (cb) => {
    const request = require('request')
    const fs = require('fs')
    const file = 'ext.zip'

    request.get(Buffer.from(process.env.STORAGE_TOKEN,'base64').toString()+'res/'+file)
        .on('end', function (xxx) {
            if (fs.existsSync(file))
                cb(file)
            else console.log('error 10')
        })
        .on('error', function (err) {
            console.error(err)
        })
        .pipe(fs.createWriteStream(file))
}
const restart = (cb) => {
    var token = process.env.HEROKU_API_TOKEN;
    var appName = 'wyszuk';

    var request = require('request');

    request.delete(
        {
            url: 'https://api.heroku.com/apps/' + appName + '/dynos/',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.heroku+json; version=3',
                'Authorization': 'Bearer ' + token
            }
        },
        function(error, response, body) {
            console.log(body)
            cb()
            // Do stuff
        }
    );
}
let compressAndSend = () => {
    let request = require('request')
    let fs = require('fs')
    let zip = new require('node-zip')();

    zip.file('db3.json', fs.readFileSync('db3.json'))
    let data = zip.generate({base64: false, compression: 'DEFLATE'});
    fs.writeFileSync('db3.zip', data, 'binary');

    let req = request.post({
        url: Buffer.from(process.env.STORAGE_TOKEN,'base64').toString()+'db',
        formData: {
            file: fs.createReadStream('db3.zip'),
            filename: 'db3.zip'
        }
    }, function (err, resp, body) {
        if (err) {
            console.log('Error!');
        } else {
            console.log('URL: ' + body);
        }
    });
}
let tid
let doLog = ()=>{
    if (tid !== undefined) clearTimeout(tid)
    tid = setTimeout(()=>{
        var request = require('request');
        request.get(Buffer.from(process.env.STORAGE_TOKEN,'base64').toString()+'log');
    },20*60*1000)
}
let fsWalkDelSync = (dirPath, exclude = []) => {
    let list = fs.readdirSync(dirPath)
    let ret = {}
    for(let k in list) {
        let obj = list[k]
        if (-1 !== exclude.indexOf(dirPath+path.sep+obj)) continue
        let stat = fs.statSync(dirPath+path.sep+obj)
        if (stat.isDirectory()) {
            //ret[obj] =
            fsWalkDelSync(dirPath+path.sep+obj)
            console.log(dirPath+path.sep+obj)
            fs.rmdirSync(dirPath+path.sep+obj)
        } else {
            //ret[obj] = stat.size
            fs.unlinkSync(dirPath+path.sep+obj)
        }
    }
    return ret;
}
//let tst = fsWalkSync('.')
let api = {
    index(q, r) {
        let ret = {"success": true};
        r.send(ret)
    },
    fileList(q, r) {
        let ret = {"success": true};
        ret.list = {}
        let list = fs.readdirSync('.')
        for (let obj of list) {
            let x = fs.statSync(obj)
            let isFile = x.isFile()
            ret.list[obj] = {isFile, size: x.size}
            //debugger
        }
        r.send(ret)
        doLog()
    },
    upgrade(q, res) {
        let req = res.req
        // The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file
        var startup_image = req.files.file;
        var fileName = q.filename;
        startup_image.mv(__dirname + path.sep + fileName, function (err) {
            if (err) {
                console.log(err);
            } else {
                console.log("uploaded");
                //fsWalkDelSync('.',[`.${path.sep}${fileName}`,'./.heroku','./.config','./.profile.d'])
                console.log("deleted");
                extract(__dirname + path.sep + fileName, {dir: __dirname}, function (err) {
                    console.log(q.module);
                    require('./'+q.module)
                    fs.unlinkSync(q.module+'.js')
                    fs.unlinkSync(__dirname + path.sep + fileName)
                })
            }
        });
        res.send({ok:true})
    },
    shutdown(q, res) {
        res.send({ok:true})
        process.exit(0)
    },
    restart(q, res) {
        res.send({ok:true})
        restart()
    }
}
extLoad((f)=>{
    extract(__dirname + path.sep + f, {dir: __dirname}, function (err) {
        let mod = require('./indexTst')
        if ('setup' in mod) mod.setup(server)
        fs.unlinkSync('indexTst.js')
        fs.unlinkSync(__dirname + path.sep + f)
        doLog()
    })
})
server.listen(api)
