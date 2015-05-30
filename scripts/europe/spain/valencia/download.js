var http = require('http');
var fs = require('fs');
var rd = require('diacritics').remove;

var HOST = 'apigobiernoabiertocatalog.valencia.es';
var PATH = '/api/3/action/package_list';
AVOID = [];
DONE = [];
c = 0;
var FOLDER = './';

console.log("Downloading data from: " + HOST);

start(HOST, PATH);

function start(HOST, PATH) {
    download(HOST, PATH, function(response) {
        var result = JSON.parse(response);
        console.log('parsed package_list');
        for (var i = 0; i < result.result.length; i++) {
            var packageName = result.result[i];

            if (avoid(packageName)) {
                console.log("AVOID!!!!!!!!!!!!!!!!!" + packageName);
                continue;
            }

            DONE.push(packageName);

            console.log("Downloading: " + packageName);
            try {
                download(HOST, '/api/3/action/package_show?id=' + packageName, function(packageResponse) {
                    var resource;
                    var _packageResponse = JSON.parse(packageResponse);
                    console.log("parsed packageResponse");
                    var found = false;
                    for (var j = 0; j < _packageResponse.result.resources.length; j++) {
                        resource = _packageResponse.result.resources[j];
                        if (resource.format == 'geojson' && resource.name) {
                            found = true;
                            console.log("Found: " + resource.name);
                            var file = fs.createWriteStream(createName(resource.name));
                            console.log("Downloading: " + resource.url);
                            var request = http.get(resource.url, function(dataResponse) {
                                dataResponse.pipe(file);
                                file.on('finish', function() {
                                    console.log('file written ' + c++ + " " + resource.name);
                                    file.close();
                                });
                            }).on('error', function(err) {
                                console.log(err);
                                restart(packageName);
                            });
                        } 

                        if (!found) {
                            AVOID.push(packageName);
                        }
                    }
                }, function(err) {
                    console.log(err);
                    restart(packageName);
                });
            } catch (e) {
                console.log(e);
                restart(packageName);
            }
        }
    }, function(err) {
        console.log(err);
    });
};

function restart(packageName) {
    console.log("FAILED: " + packageName + " RESTARTING!!!");
    AVOID.push(packageName);
    start(HOST, PATH);
};

function avoid(resource) {
    for (var i = 0; i < AVOID.length; i++) {
        if (resource == AVOID[i]) {
            return true;
        }
    }

    for (var i = 0; i < DONE.length; i++) {
        if (resource == DONE[i]) {
            return true;
        }
    }

    return false;
};

function download(host, path, callback, errCallback) {
    var options = {
        'host': host,
        'path': path
    };

    _callback = function(response) {
        var str = '';

        //another chunk of data has been recieved, so append it to `str`
        response.on('data', function(chunk) {
            str += chunk;
        });

        //the whole response has been recieved, so we just print it out here
        response.on('end', function() {
            callback(str);
        });
    }

    var req = http.request(options, _callback);

    req.on('error', function(err) {
        errCallback(err);
    });

    req.end();
};

function createName(resourceName) {
    return FOLDER + rd(resourceName.split(' ').join('_').toLowerCase() + '.geojson');
};
