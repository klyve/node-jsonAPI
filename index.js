const store = require('./store');
const types = require('./types');

const defaultOptions = {
    crawl: true,
    headers: {
        'Content-Type': 'application/vnd.api+json',
    },
}

function jsonApi(options) {
    this.options = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
        host: options.host.replace(/\/$/, ''),
    };
    this.store = (adapter) => new store(adapter, this.options);
}


const init = (options) => {
    return new jsonApi(options);
}

const get = (path, options) => {
  console.log("TRYING TO GET ITEM");
};


module.exports = init
module.exports.get = get;
module.exports.store = (adapter, options = {}) => new store(adapter, options);
module.exports.types = types;
