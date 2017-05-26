const cheerio = require('cheerio');
const logger = require('./logger');

class Parser {
    constructor(options, body) {
        this.options = options;
        this['$'] = cheerio.load(body);
    }

    get isLocked() {
        return this.$('.g-recaptcha').index() > 0;
    }

    get tickets() {
        return this.$('.listings-item:not(.listings-item--not-for-sale)');
    }

    get soldTickets() {
        return this.$('.listings-item.listings-item--not-for-sale');
    }

    get ticketsAvailable() {
        return this.getAvailableTickets();
    }

    get soldInfo() {
        return this.getSoldInfo();
    }

    getSoldInfo() {
        let $ = this.$;
        var soldPrices = [];

        this.soldTickets.each(function() {
            var price = $(this).find('meta[itemprop="price"]').attr('content');
            price = parseInt(price, 10)

            soldPrices.push(price);
        });

        var soldTotal = soldPrices.reduce((a, b) => a + b, 0);
        var soldAverage = soldTotal / (soldPrices.length || 1);

        return {
            soldTotal,
            soldAverage,
        };
    }

    getAvailableTickets() {
        let $ = this.$;
        let self = this;
        let result = [];

        this.tickets.each(function(i, elem) {
            var price = $(this).find('meta[itemprop="price"]').attr('content')
            var link = $(this).find('.listings-item--title a').attr('href');
            price = parseInt(price, 10);

            if (! link) {
                logger.error('Expected to find link for listing');
            }

            logger.info('Tickets Found! for %d euros', price);

            link = self.options.baseUrl + link;

            result.push({ link, price });
        });

        result = result.sort((t1, t2) => t1.price - t2.price);

        return result;
    }
}

module.exports = Parser;
