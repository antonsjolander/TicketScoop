const main = require('../lib/main');
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const Parser = require('../lib/parser');

describe('Parser', () => {
    let parser;
    let options = {
        url: '',
        baseUrl: 'https://www.ticketswap.nl',
    };

    beforeEach(() => {
        const body = fs.readFileSync(path.join(__dirname, './data/event-page.html'));
        parser = new Parser(options, body);
    });

    it('tickets', () => {
        expect(parser).to.have.property('tickets');
        expect(parser.tickets).to.have.length(13);
    });

    it('soldTickets', () => {
        expect(parser).to.have.property('soldTickets');
        expect(parser.soldTickets).to.have.length(5);
    });

    it('getSoldInfo', () => {
        let soldInfo = parser.getSoldInfo();

        expect(soldInfo.soldAverage).to.equal(16.4);
        expect(soldInfo.soldTotal).to.equal(82);
    });

    it('getAvailableTickets', () => {
        let tickets = parser.getAvailableTickets();

        expect(tickets).to.have.length(13);

        if (tickets.length > 1) {
            for (let i = 0; i < tickets.length - 1; i++) {
                expect(tickets[i].price).to.be.lte(tickets[i+1].price);
            }
        }
    });
});