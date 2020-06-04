var http = require('http')
var fs = require('fs')
var requestLib = require('request')

var server = http.createServer((request, response) => {
    console.log('Request = ' + request.url + ' : '+ request.method);
    var fileStream;
    response.setHeader('Access-Control-Allow-Origin','*')
    response.setHeader('Access-Control-Allow-Headers','*')
    response.setHeader('Allow','GET, POST, OPTIONS')

    //CORS OPTIONS Response
    if (request.method == 'OPTIONS') {
        response.writeHead(200)
        response.end()
        return;
    }
    //CORS Proxy
    if (request.url.startsWith('/?url=')) {
        console.log(request.url.slice(6))
        requestLib({
            url: request.url.slice(6),
            method: request.method
        }, function (error, response, body) {
            if (error) {
                console.error('error: ' + response.statusCode)
            }
            }).pipe(response)
        return;
    }
    //Bundle.js download
    if (request.url.startsWith('/bundle.js')) {
        response.writeHead(200, { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*','Allow' : 'GET, POST, OPTIONS'})
        fileStream = fs.createReadStream('dist/bundle.js');   
    } else {
        //Everything else returns index.html
        response.writeHead(200, { 'content-type': 'text/html', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*','Allow' : 'GET, POST, OPTIONS'})
        fileStream = fs.createReadStream('dist/index.html');  
    }
    fileStream.pipe(response)
})
server.listen(8080)
