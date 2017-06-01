const request = require('./request').request;
const logger = require('./logger');
const exec = require('child_process').exec;
const delay = require('./utils').delay;
const Parser = require('./parser');
const errors = require('./errors');
const runFound = require('./found-ticket').runFound;

const MAX_RETRIES = 10;

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
    let ticket = parser.popTicket();

    if (found) {
        return runFound(ticket.link, options)
            .then(result => {
                if (result && result.alreadySold) {
                    return tryNextTicket(options, parser);
                }

                return result;
            });
    } else {
        return Promise.reject(new errors.NoTicketsFoundError('Found no tickets to buy'));
    }
}

function tryNextTicket(options, parser) {
    let nextTicket = parser.popTicket();

    if (nextTicket) {
        logger.info('Found another potential ticket');

        return buyIfFound(options, { found: true, parser });
    } else {
        logger.info('Depleted all available tickets.');
        logger.info('Restarting monitor.');

        return Promise.reject(new errors.DepletedTicketsError('None of the tickets is available'));
    }
}

let retries = 0;
function runCatchHandler(options, error) {
    if (error instanceof errors.NoTicketsFoundError) {
        return retry(options, 1000, 3000);
    }

    if (error instanceof errors.DepletedTicketsError) {
        return retry(options, 1000, 3000);
    }

    logger.error('Run execution failed with error', error);

    if (retries < options.retryPolicy.retries - 1) {
        retries += 1;
        logger.info('Retries left', options.retryPolicy.retries - retries);
        return retry(options, ...options.retryPolicy.delay);
    }

    return Promise.reject(error);
}

function retry(options, minTime, maxTime) {
    maxTime = maxTime || minTime;

    return delay(function() {
        return run(options);
    }, [minTime, maxTime]);
}

function run(options = {}) {
    options.retryPolicy = Object.assign({
        delay: [4000, 8000],
        retries: MAX_RETRIES,
    }, options.retryPolicy);

    return request({
        url: options.url, 
        session: options.sessionID,
    })
        .then(parse.bind(null, options))
        .then(checkIfTicketsAvailable.bind(null, options))
        .then(buyIfFound.bind(null, options))
        .catch(runCatchHandler.bind(null, options));
}

module.exports = {
    run,
    buyIfFound,
    parse,
    checkIfTicketsAvailable,
};