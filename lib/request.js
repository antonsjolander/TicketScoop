const utils = require('./utils');
const extend = require('util')._extend;
const _request = require('request');
const logger = require('./logger');

function request({ url, session }, opts={}) {
    var jar = _request.jar();

    if (opts.authenticated) {
        let cookie = _request.cookie(`session=${session}`)
        jar.setCookie(cookie, url);

        delete opts['authenticated'];
    }

    var options = extend(opts, {
        url,
        jar,
        headers: extend({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
        }, opts.headers || {}),
    });

    return new Promise(function(resolve, reject) {
        utils.logRequest(url, options);
        
        _request(options, function(err, response, body) {
            logger.debug('response %s', url, { options, err, response, body });

            if (err) {
                reject({ error: err });
            } else if(! /^2/.test('' + response.statusCode)) {
                reject({ 
                    error: body,
                    response: response 
                });
            } else {
                resolve({
                    response: response,
                    body: body,
                });
            }
        });
    });
}

module.exports = request;