const main = require('../lib/main');
const request = require('../lib/request');
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Parser = require('../lib/parser');

let options = {
    baseUrl: 'https://www.ticketswap.nl',
    url: 'https://www.ticketswap.nl/event/thuishaven-opening-zomerseizoen/sunday/ec185f88-bad2-45f6-b7a3-31a5946bb518/190880'
};

describe('main', () => {
    let parser;

    beforeEach(() => {
        const body = fs.readFileSync(path.join(__dirname, './data/event-page.html'));
        parser = new Parser(options, body);
    })

    xit('run all', () => {
        const body = fs.readFileSync(path.join(__dirname, './data/event-page.html'));
        
        let result = main.parse(options, { body });
    });

    it('checkIfTicketsAvailable', () => {
        let f = main.checkIfTicketsAvailable(options, parser);

        expect(f).to.have.keys(['found', 'parser']);
        expect(f.found).to.be.true;
        expect(f.parser).to.be.instanceOf(Parser);
    });

    it('parse', () => {
        const body = fs.readFileSync(path.join(__dirname, './data/event-page.html'));
        const parser2 = main.parse(options, { body });

        expect(parser2).to.be.instanceof(Parser);
    });
});