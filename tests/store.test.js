import test from 'ava';
const jsonApi = require('../');

test.todo('Should ensure simple model integrity');
test.todo('Should ensure model with mixed ID type');
test.todo('Should ensure model with relationship');
test.todo('Should ensure model with has many relationship');

test('Should ensure complex model', t => {
    const types = jsonApi.types;
    const store = jsonApi.store();
    const resource = store.resource('person', {
        'id': types.key('number'),
        'name': types.attr('string'),
        'lastName': types.attr('string'),
        'address': types.has('address'),
        'friends': types.hasMany('person'),
    }).dump();

    const resourceDump = {
        type: 'person',
        id: null,
        attributes: {
            name: null,
            'last-name': null,
        },
        relationships: {
            address: null,
            friends: [],
        }
    }

    t.deepEqual(resource, resourceDump);
});



test.todo('Should GET model');
test.todo('Should POST model');
test.todo('Should PATCH model');
test.todo('Should DELETE model');