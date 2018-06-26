const store = require('./store');
const types = require('./types');
const ajaxAdapter = require('./ajaxAdapter');

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
    this.store = (adapter, headers) => new store(adapter, {...this.options, headers: {...this.options.headers, ...headers}});
}


const init = (options) => {
    return new jsonApi(options);
}



module.exports = init
module.exports.store = (adapter, options = {}) => new store(adapter, options);
module.exports.types = types;
module.exports.ajaxAdapter = ajaxAdapter;
