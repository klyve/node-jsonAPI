import test from 'ava';
const nock = require('nock');

const jsonApi = require('../');
const types = jsonApi.types;

const generatePeople = num => [...Array(num).keys()].map(id => ({
  type: 'person',
  id,
  attributes: {
    'first-name': 'Test'+id,
    'last-name': 'Test'+id,
  },
}));

const generatePerson = num => [...Array(num).keys()].map(id => ({
  type: 'people',
  id,
  attributes: {
    'first-name': 'Test'+id,
    'last-name': 'Test'+id,
  },
  relationships: {
    person:{
      data: {
        id: 2,
        type: 'person',
      },
    },
    friends: {
      data: [{
        id: 2,
        type: 'person',
      },
      {
        id: 3,
        type: 'person',
      }]
    }
  },
}));


(() => {
  const people = generatePeople(5);
  people.forEach(person => {
    nock('http://test.test')
      .persist()
      .get(`/people/${person.id}`)
      .reply(200, {
        data: person
      });
      nock('http://test.test')
      .persist()
      .patch(`/people/${person.id}`, () => true)
      .reply(200, function(uri, requestBody) {
        return requestBody;
      });
  })

  nock('http://test.test')
    .persist()
    .get(`/people`)
    .reply(200, {
      data: people
    });

  nock('http://test.test')
  .persist()
  .post('/people', () => true)
  .reply(200, function(uri, requestBody) {
    return requestBody;
  });


  const people2 = generatePerson(5);
  people2.forEach(person => {
    nock('http://test.test')
      .persist()
      .get(`/person/${person.id}`)
      .reply(200, {
        data: person
      });
  })
})()


const adapter = require('../ajaxAdapter');

test('Should ensure simple model integrity', t => {
    const store = jsonApi.store(adapter);
    const resource = store.resource('person', {
        firstName: types.attr(),
        lastName: types.attr(),
    });

    const dump = resource.dump();

    t.is(dump.firstName.type, 'attribute');
    t.is(dump.lastName.type, 'attribute');
    t.is(dump.firstName.default, undefined);
    t.is(dump.lastName.default, undefined);

    t.is(dump._name, 'person');
    t.is(dump._path, 'persons');
});



test('Should ensure resource options', t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const dump = resource.dump();
  t.is(dump._name, 'person');
  t.is(dump._path, 'people');

});

test('Should ensure model with relationship', async t => {
  const store = jsonApi.store(adapter);
  store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resource = store.resource({
    name: 'people',
    path: 'person',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
      person: types.hasOne(),
  });
  const dump = resource.dump();
  t.is(dump._name, 'people');
  t.is(dump._path, 'person');

  await resource.find(2).then(res => {
    t.is(res.get('person').get('id'), 2);
    t.is(res.get('person').get('firstName'), 'Test2');
  })
});


test('Should ensure model with has many relationship', async t => {
  const store = jsonApi.store(adapter);
  store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resource = store.resource({
    name: 'people',
    path: 'person',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
      person: types.hasOne(),
      friends: types.hasMany(),
  });
  const dump = resource.dump();
  t.is(dump._name, 'people');
  t.is(dump._path, 'person');

  await resource.find(2).then(res => {
    t.is(res.get('friends')[0].get('firstName'), 'Test3');
    const errors = store.checkIntegrity(resource.dump(), res, ['firstName', 'lastName']);
    t.is(errors.length, 0);
  });

});

test('Should response integrity', async t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resp = await resource.find(3);
  const errors = store.checkIntegrity(resource.dump(), resp, ['firstName', 'lastName']);
  t.is(errors.length, 0);

  t.pass();
});


test('Should GET a single resource', async t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resp = await resource.find(3);
  t.is(resp.id, 3);
  const errors = store.checkIntegrity(resource.dump(), resp, ['firstName', 'lastName']);
  t.is(errors.length, 0);

  const resp2 = await resource.find(4);
  t.is(resp2.id, 4);

});

test('Should GET all resources', async t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resp = await resource.findAll()
  t.is(resp.length, 5);
  t.is(resp[2].id, 2);
});


test('Should POST model', async t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
      person: types.hasOne(),
  });

  const people = generatePeople(1);

  const person = store.create('person');
  // console.log("PERSON", person);
  person.set('firstName', 'Bjarte');
  person.set('id', 'Bjarte@rendra.io');
  person.set('lastName', 'Klyve Larsen');
  person.set('person', people[0]);
  // console.log(person.relationships.friends.data);
  person.save();

  t.pass()
});
test('Should PATCH model', async t => {
  const store = jsonApi.store(adapter);
  const resource = store.resource({
    name: 'person',
    path: 'people',
    host: 'http://test.test',
  }, {
      firstName: types.attr(),
      lastName: types.attr(),
  });

  const resp = await resource.find(3);

  resp.set('firstName', 'Hello123');
  resp.set('lastName', 'World123');

  t.is(resp.get('firstName'), 'Hello123')
  t.is(resp.get('lastName'), 'World123')

  const data = await resp.save();
  t.is(data.get('firstName'), 'Hello123')
  t.is(data.get('lastName'), 'World123')
});
test.todo('Should DELETE model');
