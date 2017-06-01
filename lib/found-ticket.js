const request = require('./request').request;
const exec = require('child_process').exec;
const cheerio = require('cheerio');
const logger = require('./logger');
const utils = require('./utils');
const notifier = require('node-notifier');

function parseHTML(result) {
    var $ = cheerio.load(result.body);

    var form = $('#listing-reserve-form');
    var _endpoint = form.data('endpoint');
    var csrf = $('meta[name="csrf_token"]')[0].attribs.content;

    return {
        form,
        _endpoint,
        csrf,
    };
}

function process({ form, csrf, _endpoint }, link, options) {
    if (! _endpoint) {
        logger.warn('Ticket already sold :(!');
        return Promise.resolve({ alreadySold: true });
    }

    var endpoint = options.baseUrl + _endpoint;
    var token = form.find('input[name="token"]').attr('value');
    var reserveToken = form.find('input[name="reserve[_token]"]').attr('value');

    logger.info([
            ``,
            `Submit to ${endpoint}`,
            `FORM DATA:`,
            `token: ${token}`,
            `reserve[_token]: ${reserveToken}`,
            `csrf_token: ${csrf}`,
            `amount: 1`,
        ].join('\n'));

    return request({ url: endpoint, session: options.sessionID }, {
        method: 'POST',
        authenticated: true,
        headers: {
            'x-csrf-token': csrf,
        },
        form: {
            'reserve[_token]': reserveToken,
            token,
            amount: 1,
        }
    })
    .catch(err => {
        utils.logErrors(err)
        throw err;
    });
}

function runFound(link, options) {
    // STEP 1 submit form
    // STEP 2 request /cart
    logger.info('Requesting ticket page at %s', link);

    return request({ url: link, session: options.sessionID }, { authenticated: true })
        .then(parseHTML)
        .then(result => process(result, link, options))
        .then((result) => {
            if (result.alreadySold) {
                return result;
            }

            notifier.notify({
                title: 'TicketSwap!',
                message: 'Found a ticket, now opening your cart!',
                sound: true,
            });

            exec('open -a "Google Chrome" https://www.ticketswap.nl/cart');

            return {
                alreadySold: false,
            };
        });
}

module.exports = {
    parseHTML,
    process,
    runFound,
};