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

function chkModifiedOnS3() {
    var params = {
        Bucket: myBucket, /* required */
    };
    s3.listObjects(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            for (var i = 0; i < data.Contents.length; i++) {
                for (var j = 0; j < localDirArrayB.length; j++) {
                    if(localDirArrayB[j] < data.Contents[i].LastModified) {
                        console.log(data.Contents[i].Key + " outdated");

                        fs.unlinkSync(filePath + data.Contents[i].Key);

                        var file = fs.createWriteStream(filePath + data.Contents[i].Key);
                        file.on('close', function () {
                            //console.log('done');  //file created
                        });

                        s3.getObject(params).createReadStream().on('error', function (err) {
                            console.log(err);
                        }).pipe(file);

                        console.log(" <-> " + data.Contents[i].Key);
                    }

                }
            }
        }
    });
}


function fileAddedOnS3() {
    var params = {
        Bucket: myBucket, /* required */
    };
    s3.listObjects(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {

            for (var i = 0; i < data.Contents.length; i++) {

                if (!fs.existsSync(filePath + data.Contents[i].Key)) {
                    var params = {
                        Bucket: myBucket, /* required */
                        Key: data.Contents[i].Key, /* required */
                    };

                    var file = fs.createWriteStream(filePath + data.Contents[i].Key);
                    file.on('close', function () {
                        //console.log('done');  //file created
                    });

                    s3.getObject(params).createReadStream().on('error', function (err) {
                        console.log(err);
                    }).pipe(file);

                    console.log(" <- " + data.Contents[i].Key);
                }
            }
        }
    });
}

function fileDeletedOnS3() {
    var params = {
        Bucket: myBucket, /* required */
    };
    s3.listObjects(params, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            for (var i = 0; i < data.Contents.length; i++) {
                for(var j = 0; j < localDirArray.length; j++) {
                    if(localDirArray[j] == data.Contents[i].Key) {
                        break;    // found
                    }
                    // not found, delete
                    fs.unlinkSync(filePath + localDirArray[j]);

                    console.log(" " + localDirArray[j] + " -> X");
                }
            }
        }
    });
}

app.listen(3000, function () {
    console.log('Example app listening on port 3000')

    // sync local folder activities back to bucket
    fs.watch(filePath, function (event, filename) {
        if (fs.existsSync(filePath + filename)) {
            uploadFileToS3(filePath + filename, filename);
        } else {
            deleteFileFromS3(filePath + filename, filename);
        }
    });

    var s3BucketArray = [];
    var localDirArray = [];
    var localDirArrayB = [];

    // monitor file counts
    var chkS3size = setInterval(function() {
        localDirArray = fs.readdirSync(filePath);

        var params = {
            Bucket: myBucket, /* required */
        };
        s3.listObjects(params, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else {
                var temp = [];
                var tempB = [];

                for(var i = 0; i < data.Contents.length; i++) {
                    temp.push(data.Contents[i].Key);
                    tempB.push(data.Contents[i].LastModified);
                }
                s3BucketArray = temp;
                localDirArrayB = tempB;
            }
        });
    }, 10);


    // sync bucket activities back to local every 3 secs
    var interval = setInterval(function() {

        if(localDirArray.length < s3BucketArray.length) {
            fileAddedOnS3();
        }
        else if(localDirArray.length > s3BucketArray.length) {
            fileDeletedOnS3();
        }

        //chkModifiedOnS3();  // bug

        console.log(localDirArray.length + " <-> " + s3BucketArray.length);
    }, 3000);
})