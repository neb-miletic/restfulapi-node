/**
 * Create and export configuration variables
 */


// General container for all the environments

let environments = {};

// Staging object

environments.staging = {
    'httpPort': 3000,
    'httpsPort':3001,
    'envName': 'staging',
    'hashingSecret':'thisIsASecret'

};

environments.production = {
    'httpPort':5000,
    'httpsPort': 5001,
    'envName': 'production',
    'hashingSecret':'thisIsAlsoASecret'
};

// Determine which environment should be exported out

let currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase() : '';


// Check that the current environment is one of the environments above, if not, default to staging

let environmentToExport = typeof(environments[currentEnvironment]) == 'object' ? environments[currentEnvironment] : environments.staging;


//Export the module

module.exports = environmentToExport;

