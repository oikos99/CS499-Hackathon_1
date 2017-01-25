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
})