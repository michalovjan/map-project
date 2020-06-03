var http = require('http')
var fs = require('fs')

var server = http.createServer((request, response) => {
    console.log('Request = ' + request.url);
    var fileStream;
    if (request.url.startsWith('/bundle.js')) {
        fileStream = fs.createReadStream('dist/bundle.js');   
    } else {
        response.writeHead(200, { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*','Allow' : 'GET, POST'})
        fileStream = fs.createReadStream('dist/index.html');  
    }
    fileStream.pipe(response)
})
server.listen(8080)
