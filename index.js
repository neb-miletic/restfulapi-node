const http = require('http');
var url = require('url');
var stringDecoder = require('string_decoder').StringDecoder;

const server = http.createServer(function (req, res) {
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
        //Send the response
        res.end("Hello World!\n")
       // log the response
      console.log('Request received with this payload ',buffer)
    });
});


server.listen(3000,function () {
    console.log("The server is listening on port 3000")

})