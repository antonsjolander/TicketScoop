const request = require('../lib/request');
const expect = require('chai').expect;

describe('Request', () => {
    it('authenticated', () => {
        const url = 'https://www.ticketswap.nl/profile';
        const sessionID = 'e270c52f9eee26305ed1b17c80d15da7';

        return request(url, { sessionID })
            .then(({ response }) => {
                expect(response.statusCode).to.equal(200);
            });
    });
});