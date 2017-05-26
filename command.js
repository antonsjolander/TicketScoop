const argv = require('yargs')
    .command('start')
    .demandCommand(2)
    .argv;

console.log('Running now');

const main = require('./lib/main');

main.run({ 
    url: argv._[1],
    baseUrl: 'https://www.ticketswap.nl',
    sessionID: '5c9da77008987606c16fee0937d2e6a9',
})
    .catch(error => {
        console.error('Failed to run with error', error);
    });