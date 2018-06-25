import test from 'ava';

const jsonApi = require('../');

const options = {
    host: 'http://test.test',
    headers: {
        'Authorization': 'Bearer helloWorld',
    }
};

test('test', t => t.pass())


test('Should create an handler with options', t => {
    const apiHandler = jsonApi(options);
    const setOptions = {
        crawl: true,
        host: 'http://test.test',
        headers: {
            'Authorization': 'Bearer helloWorld',
            'Content-Type': 'application/vnd.api+json',
        }
    }
    t.deepEqual(apiHandler.options, setOptions);
});



test('Should create an API request', t => {
    t.pass();
})

test.todo('Should create a get request');
test.todo('Should create a post request');
test.todo('Should create a patch requets');
test.todo('Should create a delete requets');

test.todo('Should create a crawled request');
