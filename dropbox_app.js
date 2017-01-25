/**
 * Created by Paul on 1/23/2017.
 */
var express = require('express');
var AWS = require('aws-sdk');
var fs = require('fs');
var filePath = process.cwd() + '/dropbox/'; //'C:\\watch\\';
var s3 = new AWS.S3();
var myBucket = 'cs499-cppp';

var app = express()

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});


app.get('/', function(req, res) {
    res.send('Hello World!')
})


app.get('/list', function(req, res) {
    var params = {
        Bucket: myBucket, /* required */
    };
    s3.listObjects(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        for(var i = 0; i < data.Contents.length; i++) {
            data.Contents[i].Url = 'https://s3-us-west-2.amazonaws.com/' + myBucket + '/' + data.Contents[i].Key;
        }
        res.send(data.Contents);
    });
})


app.get('/test', function(req, res) {
    res.send('TEST!')
})

// app.get("/dropbox", function(req, res) {
//     fs.watch(filePath, function (event, filename) {
//         if (fs.existsSync(filePath + filename)) {
//             uploadFileToS3(filename);
//         } else {
//             deleteFileFromS3(filename);
//         }
//     });
// })

function uploadFileToS3(filename, name) {
    fs.readFile(filename, function (err, data) {
        var params = {
            Bucket: myBucket, /* required */
            Key: name, /* required */
            Body: data
        };
        s3.putObject(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    });
}

function deleteFileFromS3(filename, name) {
    fs.readFile(filename, function (err, data) {
        var params = {
            Bucket: myBucket, /* required */
            Key: name, /* required */
        };
        s3.deleteObject(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    });
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000')

    fs.watch(filePath, function (event, filename) {
        if (fs.existsSync(filePath + filename)) {
            uploadFileToS3(filePath + filename, filename);
        } else {
            deleteFileFromS3(filePath + filename, filename);
        }
    });

    var lastcount = 0;
    var del = 0;
    var interval = setInterval(function() {

        var params = {
            Bucket: myBucket, /* required */
        };
        s3.listObjects(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                var array = [];

                for(var i = 0; i < data.Contents.length; i++) {


                    array.push(data.Contents[i].Key);
                }
                if(lastcount > array.length) {
                    del++;
                }
                lastcount = array.length;
                console.log("last" + lastcount + "    " +"arr " + array.length);
                console.log(array);

                for(var i = 0; i < data.Contents.length; i++) {

                    if (!fs.existsSync(filePath + data.Contents[i].Key)) {
                        var params = {
                            Bucket: myBucket, /* required */
                            Key: data.Contents[i].Key, /* required */
                        };

                        var file = fs.createWriteStream(filePath + data.Contents[i].Key);
                        file.on('close', function(){
                            console.log('done');  //prints, file created

                        });

                        s3.getObject(params).createReadStream().on('error', function(err){
                            console.log(err);
                        }).pipe(file);

                        array.push(data.Contents[i].Key);
                    }

                    for(var j = 0; j < array.length; j++) {

                        if((array[j] == data.Contents[i].Key) || lastcount < array.length) {
                            console.log("found   " + file);
                            break;
                        }
                        console.log(" not found   ");
                        if(del > 0) {
                            fs.unlinkSync(filePath + array[j]);
                            del = 0;
                        }
                    }
                }
            }
        });
        console.log("Hello." + lastcount);
    }, 5000);
})