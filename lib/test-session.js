const errors = require('./errors');
const request = require('./request').request;

function isSignedIn(options) {
    return request({ url: 'https://www.ticketswap.nl/profile', session: options.sessionID })
        .then((result) => {
            // If we were redirected to the login page the session id wasn't valid
            if (result.response.request.uri.path === '/login') {
                throw new errors.NotSignedInError(`The session id ${options.sessionID} is not valid`);
            }
        });
}

module.exports.isSignedIn = isSignedIn;