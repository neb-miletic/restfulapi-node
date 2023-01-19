/*
Helpers for varioous tasks
 */

// Dependencies

let crypto = require('crypto');
let config = require('../config')


// Container for all the helpers





let helpers = {};

// Create a SHA256 hash

helpers.hash = function (str) {
    if (typeof (str) == 'string' && str.length > 0) {
       let hash = crypto.createHmac('sha256', config.hashingSecret).update(str).digest('hex')
        return hash;
    } else {
        return false;
    }
}

// Parse a JSON string to an object in all cases, without throwing

helpers.parseJsonToObject = function (str) {
   try {
       let object = JSON.parse(str);
       return object;
   } catch (e) {
       return {};
   }
};

// Create a string of a random alphanumerical characthers 

helpers.createRandomString = function (strLength) {
    strLength = typeof(strLength) == "number" && strLength > 0 ? strLength : false;
    if (strLength) {
        let possibleCharacters = [a-zA-Z0-9];

        //Start the final string
        let str = '';

        for (i=1; i<=strLength; i++) {
            // Get a random character from a possibleCharacter string

            //Append this charachter to the final string
            let randomCharacter =possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length));

            str += randomCharacter;
        }
        return str;
    } else {
        return false;
    }
}

module.exports = helpers;