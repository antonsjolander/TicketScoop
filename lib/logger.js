const winston = require('winston');
const path = require('path');

const transports =[
    new (winston.transports.Console)(),
];

if (process.env.FILE_LOG) {
    transports.push(new (winston.transports.File)({
        name: 'info-file',
        filename: path.join(__dirname, '../logs/filelog-info.log'),
        level: 'info',
        timestamp: function() {
            return Date.UTC();
        },
        formatter: function(options) {
            return `${options.timestamp()} ${options.level.toUpperCase()} ${undefined !== options.message ? options.message : ''} ${(options.meta && Object.keys(options.meta).length) ? '\n\t' + JSON.stringify(options.meta) : ''}`
        }
    }));

    transports.push(new (winston.transports.File)({
        name: 'debug-file',
        filename: path.join(__dirname, '../logs/filelog-debug.log'),
        level: 'debug',
        timestamp: function() {
            return Date.UTC();
        }
    }));
}

var logger = new (winston.Logger)({ transports });

module.exports = logger;