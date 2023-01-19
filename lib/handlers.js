
/*
Request handlers
 */

// Dependencies
let _data = require('./data')
let helpers = require('./helpers')

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
        callback(400, {'Error' : 'Missing required fields'})
    }

};

//Users - put
//Required data: phone
//Optional data: First name, last name , password,
//@TODO Only let authenticated user to update their object
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
        callback(400, {'Error' : 'Missing required fields'})
    }

};


//Token handlers

handlers.tokens = function (data,callback) {
    let acceptableMethods = ['post','get','put','delete'];
    if(acceptableMethods.indexOf(data.method) > -1) {
        handlers._tokens[data.method](data,callback);
    } else {
        callback(405);
    }
};

// Container for all the tokens methods

handlers._tokens = {};
//
// //Tokens - post
// //Required data: phone, password
// //Optional  data: none
//
handlers._tokens.post = function (data,callback) {
 let phone = typeof (data.payload.phone) == 'string' && data.payload.phone.trim().length > 10 ? data.payload.phone.trim() : false;
 let password = typeof (data.payload.password) == 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

 if (phone && password) {
// //Lookup the user who matches that phone number
//
     _data.read('users',phone,function (err,userData) {
         if (!err && userData) {
            // Hash the sent password and compare it to te password stored in the user object
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
handlers._tokens.get = function (data,callback) {

}
//
// //Tokens - put
handlers._tokens.put = function (data,callback) {

}

// //Tokens - delete
handlers._tokens.delete = function (data,callback) {

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