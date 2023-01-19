/**
 * Library for storing and sharing data
 */


// Dependencies
let fs = require('fs');
let path = require('path');
let helpers = require('./helpers')


let lib = {};

//Base directory of the data folder
lib.baseDir = path.join(__dirname,'/../.data/')


lib.create = function (dir,file,data,callback) {
    // open the file for writing

    fs.open(lib.baseDir + dir + '/' + file + '.json','wx',function (err,fileDescriptor) {
        if (!err && fileDescriptor) {
            //convert data to a string
            let stringData = JSON.stringify(data);

            //write to file and close it
            fs.writeFile(fileDescriptor,stringData,function (err) {
                if (!err) {
                    fs.close(fileDescriptor,function (err) {
                        if (!err) {
                            callback(false)
                        } else {
                            callback('Error closing this file')
                        }
                    })
                } else {
                    callback('Error writing to a new file');
                }
            })
        } else {
            callback("Could not create new file, it may already exist")
        }
    })
}

//Read data from a file
lib.read = function (dir,file,callback) {
    fs.readFile(lib.baseDir + dir + '/' + file + '.json', 'utf-8',function (err,data) {
        if (!err && data) {
            let parsedData = helpers.parseJsonToObject(data);
            callback(false,parsedData)
        } else {
            callback(err, data);
        }
    })
}

// Update data inside the file
lib.update = function (dir,file,data,callback) {
    //open the file for writing
    fs.open(lib.baseDir + dir + '/' + file + '.json','r+', function (err,fileDescriptor) {
        if (!err && fileDescriptor) {
           let stringData = JSON.stringify(data);

           //Truncate the file
            fs.ftruncate(fileDescriptor,function (err) {
                if (!err) {
                    //Write to the file and close it
                    fs.writeFile(fileDescriptor,stringData,function (err) {
                        if (!err) {
                            fs.close(fileDescriptor,function (err) {
                                if (!err) {
                                    callback(false)
                                } else {
                                    callback('Error closing the file')
                                }
                            })
                        } else {
                            callback('Error writing to existing file')
                        }
                    })
                } else {
                    callback('Error truncating the file')
                }
            });
        } else {
            callback('Could not open the file for updating, it might not exist yet')
        }
    })
}

//Delete  a file
lib.delete = function (dir,file,callback) {
    //Unlinking
    fs.unlink(lib.baseDir + dir + '/' + file +'.json',function (err) {
            if (!err) {
                callback(false)
            } else {
                callback('Error deleting the file')
            }
    })
}

module.exports = lib;