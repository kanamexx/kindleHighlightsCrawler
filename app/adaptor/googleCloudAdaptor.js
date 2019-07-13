const {Storage} = require('@google-cloud/storage');
const storage = new Storage();

class Bucket {
    constructor (bucketName){
        this.bucket = storage.bucket(bucketName);
    }
    getFileContent (pathToFile) { 
        this.bucket.file(pathToFile)
            .createReadStream()
            .setEncoding('utf8')
            .on('data', function(data) {
                console.log('data', data);
            });
    }
    uploadFile (destination, sourceStream){
        const streamInbucket =  this.bucket.file(destination)
            .createWriteStream()
            .setEncoding('utf8');
        sourceStream
            .pipe(streamInbucket);
    }
}

module.exports.Bucket = Bucket;