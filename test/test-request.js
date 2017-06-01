const request = require('../lib/request').request;
const expect = require('chai').expect;

describe('Request', () => {
    it('authenticated', () => {
        const url = 'https://www.ticketswap.nl/profile';
        const session = 'e270c52f9eee26305ed1b17c80d15da7';

        return request({ url, session })
            .then(({ response }) => {
                expect(response.statusCode).to.equal(200);
            });
    });
});