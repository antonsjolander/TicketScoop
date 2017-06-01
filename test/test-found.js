const fs = require('fs');
const path = require('path');
const request = require('../lib/request');
const expect = require('chai').expect;
const sinon = require('sinon');
const child_process = require('child_process');
const notifier = require('node-notifier');

function readFile(...args) {
    return fs.readFileSync(path.join(__dirname, ...args));
}

describe('found', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
    });

    afterEach(() => {
        sandbox.restore();

        // We have to clear main from the require cache for our stubs to work correctly
        delete require.cache[require.resolve('../lib/found-ticket')];
    });

    it('parseHTML', () => {
        const found = require('../lib/found-ticket');
        const body = readFile('./data/ticket.html');

        let result = found.parseHTML({ body });

        expect(result).to.have.keys(['form', 'csrf', '_endpoint']);
        expect(result._endpoint).to.equal('/api/tickets/1248736/e59e1b32b3/thuishaven-opening-zomerseizoen/reserve');
    });

    it('#runFound', () => {
        sandbox.stub(request, 'request').resolves({
            body: readFile('./data/ticket.html'),
        });
        let execStub = sandbox.stub(child_process, 'exec');
        let notifierStub = sandbox.stub(notifier, 'notify');

        const found = require('../lib/found-ticket');

        return found.runFound('http://google.com', {
            sessionID: 'abcdefgh',
        }).then((result) => {
            expect(execStub.called).to.be.true;
            expect(notifierStub.called).to.be.true;
        });
    });

    it('#process', () => {
        sandbox.stub(request, 'request').rejects();

        const found = require('../lib/found-ticket');

        return found.process({
            form: {},
            csrf: '',
        }).then((result) => expect(result.alreadySold).to.be.true);
    });

    it('#process', () => {
        let stub = sandbox.stub(request, 'request').resolves();
        let formAPI = {
            find: () => {
                return {
                    attr: () => {},
                };
            }
        };

        const found = require('../lib/found-ticket');

        return found.process({
            form: formAPI,
            csrf: '',
            _endpoint: 'aap',
        }, '', {
            baseUrl: 'http://google.com/',
        }).then((result) => {
            let arg = stub.getCall(0).args[1];

            expect(arg.method).to.equal('POST');
            expect(arg.authenticated).to.equal(true);
            expect(arg.headers['x-csrf-token']).to.equal('');
            expect(arg.form['reserve[_token]']).to.equal(undefined);   
            expect(arg.form['token']).to.equal(undefined);   
            expect(arg.form['amount']).to.equal(1);   
        });
    });
});