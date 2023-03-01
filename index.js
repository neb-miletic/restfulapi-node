let http = require('http');
let https = require('https')
let url = require('url');
let stringDecoder = require('string_decoder').StringDecoder;
let config = require('./lib/config')
let fs = require('fs')
let handlers = require('./lib/handlers')
let helpers = require('./lib/helpers')


//Instantiate the http server
const httpServer = http.createServer(function (req, res) {
  unifiedServer(req,res)
});

//Start the http server
httpServer.listen(config.httpPort,function () {
    console.log("The server is listening on port " + config.httpPort)

})

//Instantiate the HTTPS server
let httpsServerOptions = {
    'key': fs.readFileSync('./HTTPS/key.pem'),
    'cert': fs.readFileSync('./HTTPS/cert.pem')
}
let httpsServer = https.createServer(httpsServerOptions,function (req,res) {
    unifiedServer(req,res);
})

//Start the https server
httpsServer.listen(config.httpsPort,function () {
    console.log("The server is listening on port " + config.httpsPort)
});

// All the server logic for both the http and https server

let unifiedServer = function (req,res) {
// get the url and parse it
    const parsedUrl = url.parse(req.url, true);
    // get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g, '');

    //get the query string as an object
    let queryStringObject = parsedUrl.query;

    //get the http method
    const method = req.method.toLowerCase();

    //Get the headers
    const headers = req.headers;

    //Getting the payload
    const decoder = new stringDecoder('utf-8');
    let buffer = '';

    req.on('data',function (data) {
        buffer += decoder.write(data)
    });

    req.on('end',function () {
        buffer += decoder.end();

        //Choose the handler this request should go to. If one is not found, use the not Found handler
        let chosenHandler = typeof (router[trimmedPath]) !== 'undefined' ? router[trimmedPath] : handlers.notFound;

        //Construct the data object to send to the handler

        let data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        //Route the request specified to the router

        chosenHandler(data, function (statusCode, payload) {
            //Use status code called back by the handler, or default to 200
            statusCode = typeof (statusCode) === 'number' ? statusCode : 200;

            //Use the payload called back by the handler or default to an empty object
            payload = typeof (payload) === 'object' ? payload : {}

            //Convert the payload to a string
            let payloadString = JSON.stringify(payload);

            //Return the response
            res.setHeader('Content-Type', 'application/json')
            res.writeHead(statusCode);
            res.end(payloadString);

            console.log('Returning this response: ', statusCode, payloadString)

        });
    });
};

let router = {
    'sample': handlers.sample,
    'ping': handlers.ping,
    'users':handlers.users,
    'tokens':handlers.tokens,
    'checks': handlers.checks
}


