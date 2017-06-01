const argv = require('yargs')
    .command('start')
    .demandCommand(2)
    .argv;

console.log('Running now');

const main = require('./lib/main');

main.run({ 
    url: argv._[1],
    baseUrl: 'https://www.ticketswap.nl',
    sessionID: '171fbc16ed2314a1b1ede9695440345d',
})
    .catch(error => {
        console.error('Failed to run with error', error);
    });