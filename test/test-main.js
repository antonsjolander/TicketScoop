const request = require('../lib/request');
const expect = require('chai').expect;
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const Parser = require('../lib/parser');
const sinon = require('sinon');
const foundTicket = require('../lib/found-ticket');
const errors = require('../lib/errors');
const testSession = require('../lib/test-session');

let options = {
    baseUrl: 'https://www.ticketswap.nl',
    url: 'https://www.ticketswap.nl/event/thuishaven-opening-zomerseizoen/sunday/ec185f88-bad2-45f6-b7a3-31a5946bb518/190880'
};

function readFile(...args) {
    return fs.readFileSync(path.join(__dirname, ...args));
}

describe('main', () => {
    let parser;
    let sandbox;

    beforeEach(() => {
        const body = readFile('./data/event-page.html');
        parser = new Parser(options, body);

        sandbox = sinon.sandbox.create();

        sandbox.stub(testSession, 'isSignedIn').resolves(true);
    });

    afterEach(() => {
        sandbox.restore();

        // We have to clear main from the require cache for our stubs to work correctly
        delete require.cache[require.resolve('../lib/main')];
    });

    xit('run all', () => {
        const main = require('../lib/main');
        const body = readFile('./data/event-page.html');
        
        let result = main.parse(options, { body });
    });

    it('checkIfTicketsAvailable', () => {
        const main = require('../lib/main');
        let f = main.checkIfTicketsAvailable(options, parser);

        expect(f).to.have.keys(['found', 'parser']);
        expect(f.found).to.be.true;
        expect(f.parser).to.be.instanceOf(Parser);
    });

    it('parse', () => {
        const main = require('../lib/main');
        const body = readFile('./data/event-page.html');
        const parser2 = main.parse(options, { body });

        expect(parser2).to.be.instanceof(Parser);
    });

    it('#run (1 failing requests)', () => {
        function MyError(msg) {
            this.message = msg;
        }
        MyError.prototype = Object.create(Error);

        const stub = sandbox.stub(request, 'request');
        
        stub.rejects(new MyError('NETWORK ERROR'));

        const main = require('../lib/main');

        return main.run({
            url: 'http://google.com',
            sessionID: 'abcdefgh',
            retryPolicy: {
                delay: [0, 0],
                retries: 2,
            }
        }).then(() => expect.fail(), (error) => expect(error).to.be.instanceof(MyError));
    });

    it('#run (2 success)', () => {
        sandbox.stub(foundTicket, 'runFound').resolves('SUCCESS');
        sandbox.stub(request, 'request').resolves({
            body: fs.readFileSync('./data/event-page.html'),
        });
        const main = require('../lib/main');

        return main.run({
            url: 'http://google.com',
            sessionID: 'abcdefgh',
            retryPolicy: {
                delay: [0, 0],
                retries: 2,
            }
        }).then((result) => expect(result).to.equal('SUCCESS'));
    });

    it('#buyIfFound (1 always fail)', () => {
        sandbox.stub(foundTicket, 'runFound').resolves({ alreadySold: true });
        const main = require('../lib/main');

        main.buyIfFound(options, { found: true, parser });
    });

    it('#buyIfFound (2 only fail first time)', () => {
        let stub = sandbox.stub(foundTicket, 'runFound')
        const main = require('../lib/main');

        stub.onCall(0).resolves({ alreadySold: true });
        stub.onCall(1).resolves('BOUGHT');

        return main.buyIfFound(options, { found: true, parser })
            .then(result => expect(result).to.equal('BOUGHT'));
    });

    it('#buyIfFound (3 deplete all tickets)', () => {
        let stub = sandbox.stub(foundTicket, 'runFound')
        const main = require('../lib/main');

        stub.resolves({ alreadySold: true });

        return main.buyIfFound(options, { found: true, parser })
            .then(() => expect.fail(),
                  (error) => expect(error).to.be.instanceOf(errors.DepletedTicketsError));
    });

    it('#buyIfFound (3 no tickets available)', () => {
        const main = require('../lib/main');

        return main.buyIfFound(options, { found: false, parser })
            .then(() => expect.fail(),
                  (error) => expect(error).to.be.instanceOf(errors.NoTicketsFoundError));
    });
});