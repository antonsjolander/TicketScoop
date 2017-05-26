const fs = require('fs');
const path = require('path');
const request = require('../lib/request');
const found = require('../lib/found-ticket');
const expect = require('chai').expect;

describe('found', () => {
    it('parseHTML', () => {
        const body = fs.readFileSync(path.join(__dirname, './data/ticket.html'));

        let result = found.parseHTML({ body });

        expect(result).to.have.keys(['form', 'csrf', '_endpoint']);
        expect(result._endpoint).to.equal('/api/tickets/1248736/e59e1b32b3/thuishaven-opening-zomerseizoen/reserve');
    });

    // it('process', () => {
    //     const link = 'https://www.ticketswap.nl/listing/thuishaven-opening-zomerseizoen/1248736/e59e1b32b3';
    //     const body = fs.readFileSync(path.join(__dirname, './data/ticket.html'));

    //     let result = found.parseHTML({ body });

    //     return found.process(result, link, {
    //         baseUrl: 'https://www.ticketswap.nl'
    //     });
    // });
});