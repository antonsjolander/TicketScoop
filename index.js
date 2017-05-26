var _request = require('request')
  , exec = require('child_process').exec
  , fs = require('fs')
  , util = require('util')
  , extend = require('util')._extend
  , notifier = require('node-notifier')
  , winston = require('winston')
  , blessed = require('blessed')
  , contrib = require('blessed-contrib')
  , cheerio = require('cheerio');

var screen = blessed.screen({
    smartCSR: true
});

screen.title = 'Auto TicketSwap';

var log = blessed.log({
    top: '0',
    width: '50%',
    height: '100%',
    padding: {
        left: 1,
        right: 1,
        top: 0,
        bottom: 0,
    },
    border: {
        type: 'line',
    },
    style: {
      border: {
        fg: '#f0f0f0'
      },
    },
    label: 'Log'
});

var continueBtn = blessed.button({
  mouse: true,
  keys: true,
  shrink: true,
  padding: {
    left: 1,
    right: 1
  },
  left: 10,
  top: 2,
  shrink: true,
  name: 'Continue',
  content: 'Continue',
  style: {
    bg: 'white',
    focus: {
      bg: 'green'
    },
    hover: {
      bg: 'green'
    }
  }
});

var requestLine = contrib.line({
    style: { 
        line: "yellow",
        text: "green",
        baseline: "black",
        border: {
          fg: '#f0f0f0'
        },
    },
    padding: {
        left: 1,
        right: 1,
        top: 0,
        bottom: 0,
    },
    border: {
        type: 'line',
    },
    top: '0',
    left: '50%+1',
    width: '50%',
    height: '50%', 
    xLabelPadding: 3, 
    xPadding: 5, 
    showLegend: true,
    wholeNumbersOnly: false, //true=do not show fraction in y axis
    label: 'Request',
});

var average = blessed.Text({
    top: '50%',
    left: '50%+1',
    width: '50%',
    height: '50%',
    padding: {
        left: 1,
        right: 1,
        top: 0,
        bottom: 0,
    },
    border: {
        type: 'line',
    },
    style: {
      border: {
        fg: '#f0f0f0'
      },
    },
    padding: 1,
    content: '',
    label: 'Stats',
});

screen.append(continueBtn);
screen.append(requestLine);
screen.append(log);
screen.append(average);

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
    return process.exit(0);
});

winston.handleExceptions(new winston.transports.File({ filename: 'logs/exceptions.log' }));

var BlessedLogger = winston.transports.BlessedLogger = function (options) {
    this.name = 'Blessed Logger';
    this.level = options.level || 'info';
}

util.inherits(BlessedLogger, winston.Transport);

BlessedLogger.prototype.log = function(level, msg, meta, callback) {
    log.add(msg);

    callback(null, true);
}

var logger = new (winston.Logger)({
    transports: [new (winston.transports.File)({
        name: 'info-file',
        filename: 'logs/filelog-info.log',
        level: 'info',
        timestamp: function() {
            return Date.UTC();
        },
        formatter: function(options) {
            return `${options.timestamp()} ${options.level.toUpperCase()} ${undefined !== options.message ? options.message : ''} ${(options.meta && Object.keys(options.meta).length) ? '\n\t' + JSON.stringify(options.meta) : ''}`
        }
    }), new (winston.transports.File)({
        name: 'debug-file',
        filename: 'logs/filelog-debug.log',
        level: 'debug',
        timestamp: function() {
            return Date.UTC();
        }
    }), new (winston.transports.BlessedLogger)({

    })]
});

const BASE_URL = 'https://www.ticketswap.nl';

// const URL = 'https://www.ticketswap.nl/event/thuishaven-opening-zomerseizoen/saturday/ec185f88-bad2-45f6-b7a3-31a5946bb518/190860';
const URL = 'https://www.ticketswap.nl/event/thuishaven-opening-zomerseizoen/sunday/ec185f88-bad2-45f6-b7a3-31a5946bb518/190880';

const SESSION_ID = 'e270c52f9eee26305ed1b17c80d15da7';

function randomTimeout(lower, upper) {
    return Math.random() * (upper - lower) + lower;
}

function delay(fn, [lower, upper]) {
    var time = randomTimeout(lower, upper);

    return new Promise(function(resolve, reject) {
        setTimeout(function() {
            resolve(fn.call());
        }, time);
    });
}

function logErrors(reason) {
    if (reason instanceof Error) {
        logger.error('Error in code')
        logger.error(reason);
        return;
    }

    logger.error('Request failed')
    logger.error('Error reason', reason.error);

    fs.writeFileSync('./error.log', JSON.stringify(reason));

    logger.info('Wrote response in error.log');
}

function displayRequestData(title, data) {
    var y = [];
    var x = [];

    Object.keys(data).forEach(function(date) {
        var xPoint = new Date(date * 1000 * 60).toISOString().slice(11, 16);
        x.push(xPoint);
        y.push(data[date]);
    });

    return {
        title,
        x,
        y,
    };
}

var requestData200 = JSON.parse(fs.readFileSync('./data/requests_200.dump'));
var requestDataOther = JSON.parse(fs.readFileSync('./data/requests_other.dump'));
var TOTAL_REQUESTS = 0;
var AVERAGE_PRICE = 0;

process.on('exit', function() {
    var data = JSON.stringify(requestData200);
    fs.writeFileSync('./data/requests_200.dump', data);

    data = JSON.stringify(requestDataOther);
    fs.writeFileSync('./data/requests_other.dump', data);
});

function logRequest(url, options) {
    logger.info('Request %s %s', options.method || 'GET', url, { options: options });
}

function statResponse(response={}) {
    var timestamp = Math.floor(Date.now() / 1000 / 60);
    var requestData;

    TOTAL_REQUESTS++;

    if (/^2/.test('' + response.statusCode)) {
        requestData = requestData200;
    } else {
        requestData = requestDataOther;
    }

    if (requestData[timestamp]) {
        requestData[timestamp] += 1;
    } else {
        requestData[timestamp] = 1;
    }

    var uno = displayRequestData('success', requestData200);
    var dos = displayRequestData('failed', requestDataOther);

    average.setContent([
        `Requests completed: ${TOTAL_REQUESTS}`,
        `Average Price: ${AVERAGE_PRICE}`,
    ].join('\n'));
    requestLine.setData([uno, dos]);
}

function request(url, opts={}) {
    var jar = _request.jar();

    if (opts.authenticated) {
        let cookie = _request.cookie(`session=${SESSION_ID}`)
        jar.setCookie(cookie, url);

        delete opts['authenticated'];
    }

    var options = extend(opts, {
        url,
        jar,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36',
        },
    });


    return new Promise(function(resolve, reject) {
        logRequest(url, options);
        
        _request(options, function(err, response, body) {
            statResponse(response);
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

var SOLD_TICKETS = [];

function runFound(link) {
    // STEP 1 submit form
    // STEP 2 request /cart
    logger.info('Requesting ticket page at %s', link);

    if (SOLD_TICKETS.includes(link)) {
        return Promise.reject('Already sold');
    }

    return request(link, { authenticated: true })
        .then(function(result) {
            var $ = cheerio.load(result.body);

            var form = $('#listing-reserve-form');
            var _endpoint = form.data('endpoint');

            if (! _endpoint) {
                SOLD_TICKETS.push(link);
                logger.warn('Ticket already sold :(!');
                return Promise.reject('Already sold');
            }

            var endpoint = BASE_URL + _endpoint;
            var token = form.find('input[name="token"]').attr('value');

            logger.info([
                    ``,
                    `Submit to ${endpoint}`,
                    `FORM DATA:`,
                    `token: ${token}`,
                    `amount: 1`,
                ].join('\n'));

            return request(endpoint, {
                method: 'POST',
                authenticated: true,
                form: {
                    token,
                    amount: 1,
                }
            })
            .catch(logErrors);
        })
        .then(function() {
            notifier.notify({
                title: 'TicketSwap!',
                message: 'Found a ticket, now opening your cart!',
                sound: true,
            });

            exec('open -a "Google Chrome" https://www.ticketswap.nl/cart');
        })
}

function run() {

    return request(URL)
        .then(function(result) {
            var $ = cheerio.load(result.body);

            var isLocked = $('.g-recaptcha').index() > 0;

            if (isLocked) {
                logger.warn('Locked by TicketSwap from performing more requests');
                exec(`open -a "Google Chrome" ${URL}`);
                return delay(function() {
                    return run();
                }, [5*60*1000, 10*60*1000]);
            }

            var tickets = $('.listings-item:not(.listings-item--not-for-sale)');
            var soldTickets = $('.listings-item.listings-item--not-for-sale');
            var cheapest = [];

            tickets.each(function(i, elem) {
                var price = $(this).find('meta[itemprop="price"]').attr('content')
                var link = $(this).find('.listings-item--title a').attr('href');
                price = parseInt(price, 10);

                if (! link) {
                    logger.error('Expected to find link for listing');
                }

                link = BASE_URL + link;

                if (SOLD_TICKETS.includes(link)) {
                    logger.info('Ticket found is already sold, skipping');
                    return;
                }

                if (cheapest.length && price < cheapest[cheapest.length-1].price) {
                    cheapest.push({
                        price,
                        link,
                    });
                } else if (cheapest.length) {
                    cheapest.push({
                        price,
                        link,
                    });
                }

                logger.info('Tickets Found! for %d euros', price);
            });

            var soldPrices = [];
            soldTickets.each(function() {
                var price = $(this).find('meta[itemprop="price"]').attr('content');
                price = parseInt(price, 10)

                soldPrices.push(price);
            });

            var soldTotal = soldPrices.reduce((a, b) => a + b, 0);
            var soldAverage = soldTotal / (soldPrices.length || 1);

            AVERAGE_PRICE = soldAverage;

            logger.info('Average price per ticket %d', soldAverage);

            if (tickets.index() === -1 || cheapest.length === 0) {
                logger.info('No tickets found!');

                return delay(function() {
                    return run();
                }, [5000, 10000]);
                
            } else {
                logger.info('Found cheapest with price', cheapest[cheapest.length-1].price);

                let delta = soldAverage - cheapest[cheapest.length-1].price;

                if (delta < 0) {
                    logger.info('Which is %d euros cheaper then the average', Math.abs(delta));
                } else {
                    logger.info('Which is %d euros more expensive than the average', Math.abs(delta));
                }

                return runFound(cheapest[cheapest.length-1].link)
                    .catch(function(reason) {
                        if (reason === 'Already sold') {
                            return delay(function() {
                                return run();
                            }, [5000, 10000]);
                        } else {
                            return Promise.reject(reason);
                        }
                    });
            }
        });

}

// MAIN //

logger.info('Starting for %s', URL);

run()
    .then(function() {
        logger.info('Finished');
    })
    .catch(logErrors);