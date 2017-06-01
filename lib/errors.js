function DepletedTicketsError(message) {
    this.name = 'DepletedTicketsError';
    this.message = message;
    this.stack = (new Error()).stack;
}

DepletedTicketsError.prototype = Object.create(Error);

function NoTicketsFoundError(message) {
    this.name = 'NoTicketsFoundError';
    this.message = message;
    this.stack = (new Error()).stack;
}

NoTicketsFoundError.prototype = Object.create(Error);


module.exports = {
    DepletedTicketsError,
    NoTicketsFoundError,
};
