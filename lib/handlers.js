
// noinspection DuplicatedCode

/*
Request handlers
 */

// Dependencies
let _data = require('./data')
let helpers = require('./helpers')
let config = require('./config')

//Define the request router
let handlers = {};

//Ping handler
handlers.ping = function (data,callback) {
    callback(200);
};

//Sample handler
handlers.sample = function (data,callback) {
//Callback a http status code, and a payload object
    callback(406,{'name': 'sample handler'});
}
//Not found handler
handlers.notFound = function (data,callback) {
    callback(404,{'Error':'Not found'});
}


// Users handler

handlers.users = function (data,callback) {
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._users[data.method](data,callback);
    } else {
        callback(405);
    }
};

//Container for the users submethods
handlers._users = {};

//Users post
// Required data: firstName, lastName, phone, password, tosAgreement
//Optional data: none

handlers._users.post = function (data,callback) {
  //Check that all required fields are filled in
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof (data.payload.tosAgreement) == 'boolean' && data.payload.tosAgreement === true;

    if (firstName && lastName && phone && password && tosAgreement) {
      //make sure that user doesn't already exist
       _data.read('users',phone,function (err) {
           if (err) {
             // Hash the password
             let hashPassword = helpers.hash(password);

             // Create user object
              if (hashPassword) {
                  let userObject = {
                      'firstName' : firstName,
                      'lastName' : lastName,
                      'phone' : phone,
                      'hashedPassword' : hashPassword,
                      'tosAgreement' : true
                  }

                  //Store the user

                  _data.create('users',phone,userObject,function (err) {
                      if (!err) {
                          callback(200)
                      } else {
                          console.log(err);
                          callback(500,{'Error' : 'Could not create a new user'})
                      }

                  });
              } else {
                  callback(500, { 'Error' : 'Could not hash password'})
              }
           } else {
               //User already exist
               callback(400,{'Error' : 'A user with that phone number already exist'})
           }

       })
    } else {
        callback(400, {'Error' : 'Missing required fields for users post method'});
    }


};

// Users - get
// Required data: phone
// Optional data: none
// @TODO Only let authenticated users access their object. Don't let them access anyone else's objects
handlers._users.get = function (data,callback) {
    //Check that the phone number is provided
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        // Get the token from the header
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        // Verify that the given token is valid for the phone number
        handlers._tokens.verifyToken(token,phone,function (tokenIsValid) {
            if(tokenIsValid) {
                // Lookup the user
                _data.read('users',phone,function (err,data) {
                    if (!err && data) {
                        //Remove the hashed password from the user object before returning it to requester
                        delete  data.hashedPassword;
                        callback(200,data);
                    } else {
                        callback(404);
                    }
                })
            } else {
                callback(403, {'Error' : 'Missing required token in header or token is invalid'})
            }
            
        })
    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }

};

//Users - put
//Required data: phone
//Optional data: First name, last name , password,
handlers._users.put = function (data, callback) {
    // Check for the required filed
    let firstName = typeof (data.payload.firstName) == 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof (data.payload.lastName) == 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
    let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    //Check for the optional fields

    // Error if the phone is invalid

    if (phone) {
        //Error if nothing is sent to update
        if (firstName || lastName || password) {
            let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
            handlers._tokens.verifyToken(token,phone,function (tokenIsValid) {
                if (tokenIsValid) {
                    _data.read('users',phone,function (err,userData) {
                        //Update ethe fields that are necessary
                        if (!err && userData) {
                            if (firstName) {
                                userData.firstName = firstName;
                            }
                            if (lastName) {
                                userData.lastName = lastName;
                            }
                            if (password) {
                                userData.password = helpers.hash(password);
                            }

                            // Store system updates to disk
                            _data.update('users',phone,userData,function (err) {
                                if (!err) {
                                    callback(200);
                                } else {
                                    console.log(err);
                                    callback(500, {'Error': 'Could not update the user'})
                                }
                            })
                        } else {
                            callback(400, {'Error': 'The specified user does not exist'})
                        }
                    })
                } else {
                    callback(403, {'Error' : 'Missing required token in header or token is invalid'})
                }
            })

        } else {
            callback(400, {'Error': 'Missing fields to update'})
        }
    } else {
        callback(400, {'Error' : 'Missing required field'})
    }

};

//Users - delete
//Required field: phone
//@TODO Only let the authenticated user to delete their objects. Don't let them delete anyone's else files
//@TODO Delete (clean up) any other data files associated with this user
handlers._users.delete = function (data,callback) {
    //Check that the phone number is valid
    let phone = typeof (data.queryStringObject.phone) == 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
    if (phone) {
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        handlers._tokens.verifyToken(token,phone,function (tokenIsValid) {
            if (tokenIsValid) {
                _data.read('users',phone,function (err,data) {
                    if (!err && data) {
                        //Remove the hashed password from the user object before returning it to requester
                        _data.delete('users',phone,function (err) {
                            if (!err) {
                                callback(200,data);
                            } else {
                                callback(500,{'Error':'Could not delete specified user'})
                            }
                        })

                    } else {
                        callback(400, {'Error': 'Could not find specified user'});
                    }
                })

            } else {
                callback(403, {'Error' : 'Missing required token in header or token is invalid'})
            }
        })
    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }

};


//Token handlers

// Container for all the tokens methods

handlers._tokens = {};

handlers.tokens = function (data,callback) {
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405);
    }
};

//
// //Tokens - post
// //Required data: phone, password
// //Optional  data: none
//
handlers._tokens.post = function (data,callback) {
 let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
 let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

 if (phone && password) {
 //Lookup the user who matches that phone number

     _data.read('users',phone,function (err,userData) {
         if (!err && userData) {
            // Hash the sent password and compare it to the password stored in the user object
             let hashedPassword = helpers.hash(password);
             if (hashedPassword === userData.hashedPassword) {
                // If valid, create new token with random name. Set expiration data 1 hour in the future
                 let tokenId = helpers.createRandomString(20);
                 let expires = Date.now() + 1000 * 60 * 60;
                 let tokenObject = {
                     'phone': phone,
                     'id': tokenId,
                     'expires': expires
                 }

                 _data.create('tokens',tokenId,tokenObject, function (err) {
                     if (!err) {
                         callback(200, tokenObject)
                     } else {
                         callback(500, {'Error':'Could not create new token'})
                     }
                 })

             } else {
                 callback(400, {'Error': 'Password did not match specified user stored password'})
             }
         } else {
             callback(400, {'Error': 'Could not find the user'})
         }
     })
 } else {
     callback(400, {'Error' : 'Missing required fields'})
 }

}
//
// //Tokens - get
// Required data: id
// Optional data: none
handlers._tokens.get = function (data,callback) {
    //Check that the phone number is provided
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens',id,function (err,tokenData) {
            if (!err && tokenData) {
                callback(200,tokenData);
            } else {
                callback(404);
            }
        })
    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }


}

//
// //Tokens - put
// Required data: id, extend
// Optional data: none
handlers._tokens.put = function (data,callback) {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;
    let extend = typeof (data.payload.extend) == 'boolean' && data.payload.extend === true;
    if (id && extend) {
// Lookup the token
        _data.read("tokens",id,function (err,tokenData) {
            if (!err && tokenData) {
                // Check to make sure that token has not already expired
                if (tokenData.expires > Date.now()) {
                    tokenData.expires = Date.now() + 1000 * 60 * 60
                    
                    //Store the new value
                    _data.update('tokens',id,tokenData,function (err) {
                        if (!err) {
                            callback(200)
                        } else {
                            callback(500, {"Error" : "Could not update token expiration"})
                        }
                    })
                    
                } else {
                    callback(400, {"Error" : "The token has already expired and cannot be extended"})
                }
            } else {
                callback(400,{"Error" : "Specified token does not exists"})
            }
        })
    } else {
        callback(400, {"Error": "Missing required fields or fields are invalid"})
    }

}

// //Tokens - delete
handlers._tokens.delete = function (data,callback) {
    //Check if id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        _data.read('tokens',id,function (err,data) {
            if (!err && data) {
                //Remove the hashed password from the user object before returning it to requester
                _data.delete('tokens',id,function (err) {
                    if (!err) {
                        callback(200,data);
                    } else {
                        callback(500,{'Error':'Could not delete specified tokens'})
                    }
                })

            } else {
                callback(400, {'Error': 'Could not find specified tokens'});
            }
        })
    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }
}


// Verify if the given id is currently valid for a given user

handlers._tokens.verifyToken = function (id,phone,callback) {
    //Lookup the token
    _data.read('tokens',id, function (err,tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true)
            } else {
                callback(false)
            }
        } else {
            callback(false)
        }
    })
}


// Checks

handlers.checks = function (data,callback) {
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._checks[data.method](data,callback);
    } else {
        callback(405);
    }
};


// Container for all the checks methods

handlers._checks = {}

// Checks - post
// Request data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none

handlers._checks.post = function (data,callback) {
    //  Validate all the inputs
    let protocol = typeof (data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0  ? data.payload.url.trim() : false;
    let method = typeof (data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array &&  data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    if (protocol && url && method && successCodes  && timeoutSeconds) {
        // Get the token from the headers
        let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
        // Lookup the user by reading the token

        _data.read('tokens', token, function (err,tokenData) {
            if (!err && tokenData) {
                let userPhone = tokenData.phone
                // Lookup the user data

                _data.read('users',userPhone,function (err,userData){
                    if (!err && userData) {
                        let userChecks = typeof (userData.checks) == 'object' && userData.checks instanceof Array ? userData.checks : []
                        // Verify that user has less checks than the number of max-checks-per-user
                        if (userChecks.length < config.maxChecks) {
                            //Create a random id for the check
                            let checkId = helpers.createRandomString(20)

                            //Create check object and include the user phone
                            let checkObject = {
                                'id' : checkId,
                                'userPhone' : userPhone,
                                'protocol' : protocol,
                                'url' : url,
                                'method' : method,
                                'successCodes': successCodes,
                                'timeoutSeconds' : timeoutSeconds
                            }
                            //Save the object

                            _data.create('checks', checkId,checkObject, function (err) {
                                if (!err) {
                                    // Add the check id to the users object
                                    userData.checks = userChecks
                                    userData.checks.push(checkId)

                                    //Save the new user data
                                    _data.update('users',userPhone,userData,function (err) {
                                        if (!err) {
                                            // Return the data about the new check
                                            callback(200,checkObject)
                                        } else {
                                            callback(500, {'Error':'Could not update the user with new check'})
                                        }
                                    })

                                } else {
                                    callback(500, {'Error' : 'Could not create the user with the new check'})
                                }
                            })

                        } else {
                            callback(400, { 'Error':"The user already has the maximum number of checks = " + config.maxChecks})
                        }
                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(403)
            }
        })
    } else {
        callback(400, {'Error':'Missing required inputs, or inputs are invalid '})
    }
}

// Checks - get
// Requierd data: id
// Optional data; none
//
handlers._checks.get = function (data,callback) {
    //Check that the id is valid
    let id = typeof (data.queryStringObject.id) == 'string' && data.queryStringObject.phone.trim().length === 20 ? data.queryStringObject.id.trim() : false;
    if (id) {
        //Lookup the check
        _data.read('check',id,function(err,checkData){
            if (!err && checkData) {
                // Get the token from the header
                let token = typeof (data.headers.token) == 'string' ? data.headers.token : false
                // Verify that the given token is valid and belongs to the user who created the check
                handlers._tokens.verifyToken(token,checkData.userPhone,function (tokenIsValid) {
                    if(tokenIsValid) {
                        // Return the check data
                        callback(200,checkData)

                    } else {
                        callback(403)
                    }
                })
            } else {
                callback(404)
            }
        })

    } else {
        callback(400, {'Error' : 'Missing required fields'})
    }

};

// Checks - put
// Required data: id
// Optional data: protocol, url, method, successCode, timeoutSeconds, (one must be given)

handlers._checks.put = function(data,callback) {
    let id = typeof (data.payload.id) == 'string' && data.payload.id.trim().length === 20 ? data.payload.id.trim() : false;

    //Check for the optional files
    let protocol = typeof (data.payload.protocol) == 'string' && ['https','http'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    let url = typeof (data.payload.url) == 'string' && data.payload.url.trim().length > 0  ? data.payload.url.trim() : false;
    let method = typeof (data.payload.method) == 'string' && ['post','get','put','delete'].indexOf(data.payload.method) > -1 ? data.payload.method : false;
    let successCodes = typeof (data.payload.successCodes) === 'object' && data.payload.successCodes instanceof Array &&  data.payload.successCodes.length > 0 ? data.payload.successCodes : false;
    let timeoutSeconds = typeof (data.payload.timeoutSeconds) == 'number' && data.payload.timeoutSeconds % 1 === 0 && data.payload.timeoutSeconds >= 1 && data.payload.timeoutSeconds <= 5 ? data.payload.timeoutSeconds : false;

    // Check to make sure the id is valid
    if (id) {
    // Check to make sure one or more optional fields has been sent
        if (protocol || url || method || successCodes || timeoutSeconds) {
        // Lookup the check
            _data.read('checks',id,function (err,checkData) {
                
            })
        } else {
            callback(400, {"Error" : "Missing fields to update"})
        }
    } else {
        callback(400, {"Error": "Missing the required filed"})
    }

}




//Ping handler
handlers.ping = function (data,callback) {
    callback(200);
};

//Sample handler
handlers.sample = function (data,callback) {
//Callback a http status code, and a payload object
    callback(406,{'name': 'sample handler'});
}
//Not found handler
handlers.notFound = function (data,callback) {
    callback(404);
}


module.exports = handlers