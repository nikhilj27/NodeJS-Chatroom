var http = require('http');   //Built-in http module provides HTTP server and client functionality
var fs = require('fs');  //Built-in fs module provides filesystem related functionality
var path = require('path');  //Built-in path module provides filesystem path–related functionality 
var mime = require('mime');  //Add-on mime module provides ability to derive a MIME type based on a filename extension

var cache = {};  //cache object is where the contents of cached files are stored



function send404(response) {
    response.writeHead(404, { 'Content-Type': 'text/plain' });
    response.write('Error 404: resource not found.');
    response.end();
}

function sendFile(response, filePath, fileContents) {
    response.writeHead(200, { "content-type": mime.lookup(path.basename(filePath)) });
    response.end(fileContents);
}


function serveStatic(response, cache, absPath) {
    if (cache[absPath]) {   // check if file is cached in memory
        sendFile(response, absPath, cache[absPath]);    // serve file from memory.
    } else {
        fs.exists(absPath, function (exists) {   // check if file exists
            if (exists) {
                fs.readFile(absPath, function (err, data) {   // read file from disk
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);   // serve file read from disk.
                    }
                });
            } else {
                send404(response);  // serve HTTP 404 response
             }
        });
    }
}



var server = http.createServer(function (request, response) {   // create HTTP server using anonymous function to define pre-request behavior
    var filePath = false;
    if (request.url == '/') {
        filePath = 'public/index.html';  // Determine HTML file to be served by default.
    } else {
        filePath = 'public' + request.url;  // Translate URL path to relative file path.
    }

    var absPath = './' + filePath;
    serveStatic(response, cache, absPath);  // serve static file
});


server.listen(3000, function () {
    console.log('Server listening on port 3000');
});

var chat_server = require('./lib/chat_server.js');
chat_server.listen(server);
