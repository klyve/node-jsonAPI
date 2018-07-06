import test from 'ava';
const types = require('../types')

const resolver = {
  resolve: (type, id) => ({type, id})
}

const generatePeople = num => [...Array(num).keys()].map(id => ({type: 'person', id}));

test('Should ensure attr type', t => {
  const name = types.attr('name');

  t.is(name.type, 'attribute');
  const nameValue = "Test";
  let data = {
    attributes: {},
  };

  const serialized = name.serialize({name: nameValue}, data, 'name');
  t.is(serialized.attributes.name, nameValue);

  const deserialized = name.deserialize(serialized, 'name');
  t.is(deserialized, nameValue);
});


test('Should ensure has-one type', t => {
  const person = types.hasOne('friend');
  const friend = generatePeople(1)[0];
  let resource = {
    friend,
  };

  let data = {
    relationships: {}
  };

  const serialized = person.serialize(resource, data, 'friend');
  t.is(serialized.relationships.friend.data.type, 'person');
  t.is(serialized.relationships.friend.data.id, friend.id);


  const deserialized = person.deserialize.bind(resolver)(serialized, 'friend');
  t.deepEqual(deserialized, friend);
});

test('hasOne deserialize should throw if no resolver is found', t => {
  const person = types.hasOne('friend');
  const friend = generatePeople(1)[0];
  let resource = {
    friend,
  };
  let data = {
    relationships: {}
  };
  const serialized = person.serialize(resource, data, 'friend');

  t.throws(() => {
    person.deserialize(serialized, 'friend');
  });
});

test('Should ensure hasMany type', t => {
  const person = types.hasMany('friend');
  const friends = generatePeople(4);
  let resource = {
    friend: friends,
  };
  let data = {
    relationships: {}
  };
  const serialized = person.serialize(resource, data, 'friend');
  t.deepEqual(serialized.relationships.friend.data, resource.friend);

  const deserialized = person.deserialize.bind(resolver)(serialized, 'friend');
});
