const argv = require('yargs')
    .command('start')
    .alias({
        's': 'session'
    })
    .demandOption('s', 'We need your session id to reserve tickets')
    .demandCommand(2)
    .argv;

console.log('Running now');

const main = require('./lib/main');

main.run({ 
    url: argv._[1],
    baseUrl: 'https://www.ticketswap.nl',
    sessionID: argv['s'],
})
    .catch(error => {
        console.error('Failed to run with error', error);
    });