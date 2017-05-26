const request = require('./request');
const logger = require('./logger');
const exec = require('child_process').exec;
const runFound = require('./found-ticket').runFound;
const delay = require('./utils').delay;
const Parser = require('./parser');

function parse(options, result) {
    const parser = new Parser(options, result.body);

    if (parser.isLocked) {
        logger.warn('Locked by TicketSwap from performing more requests');
        exec(`open -a "Google Chrome" ${options.url}`);
        return delay(function() {
            return run(options);
        }, [5*60*1000, 10*60*1000]);
    }

    return parser;
}

function checkIfTicketsAvailable(options, parser) {
    if (parser.ticketsAvailable.length === 0) {
        logger.info('No tickets found!');

        return {
            found: false,
            parser,
        };
    } else {
        let cheapest = parser.ticketsAvailable[0];

        logger.info('Found cheapest with price', cheapest.price);

        let delta = parser.soldInfo.soldAverage - cheapest.price;

        if (delta < 0) {
            logger.info('Which is %d euros cheaper then the average', Math.abs(delta));
        } else {
            logger.info('Which is %d euros more expensive than the average', Math.abs(delta));
        }

        return {
            found: true,
            parser,
        };
    }
}

function buyIfFound(options, { found, parser }) {
    let ticket = parser.ticketsAvailable[0];

    if (found) {
        return runFound(ticket.link, options)
            .catch(function(reason) {
                if (reason === 'Already sold') {
                    return delay(function() {
                        return run(options);
                    }, [1000, 3000]);
                } else {
                    return Promise.reject(reason);
                }
            });
    } else {
        return delay(function() {
                return run(options);
        }, [1000, 3000]);
    }
}

function run(options = {}) {
    return request({
        url: options.url, 
        session: options.sessionID,
    })
        .then(parse.bind(null, options))
        .then(checkIfTicketsAvailable.bind(null, options))
        .then(buyIfFound.bind(null, options));
}

module.exports = {
    run,
    buyIfFound,
    parse,
    checkIfTicketsAvailable,
};