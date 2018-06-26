const types = require('./types');

const inStore = function(name) {
  return !!(this._store[name]);
}

// Used internally to find an item from the data store
const findItem = function(type, id) {
  if(!this._data[type]) return null;

  const item = this._data[type].find(elem => elem.id === id);
  return item  || null;
}


const getItem = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);

  return new Promise((resolve, reject) => {
      this._adapter.getItem(item, this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}

const getAll = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);
  return new Promise((resolve, reject) => {
      this._adapter.getAll(item, this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}


const storeResponse = async function(resp, resource) {
  if(!this.inStore(resource.type))
    throw new Error(`Resource does not exist in store`);

  const res = this._store[resource.type];
  let relationships = {};
  if(resp.data instanceof Array) {
      const response = resp.data.map(item => {
        if(this.findItem(item.type, item.id)) {
          this.setItem(item, res);
        }else {
          this.createItem(item, res);
        }
        return this.model(item.id, item.type);
      });
      return response;
  }else {
    const item = this.findItem(resp.data.type, resp.data.id);

    if(item) {
      await this.setItem(resp.data, res);
    }else {
      await this.createItem(resp.data, res);
    }
    return this.model(resp.data.id, resp.data.type);
  }

}

const setItem = function(data, resource) {
  // let this._data = {
  //   ...this._data,
  // };

  this._data[data.type] = this._data[data.type].filter(elem => elem.id !== data.id);
  // this._data = this._data;
  return this.createItem(data, resource);
}

const resolveRelationships = async function(obj, resource) {
  const promises = [];
  Object.entries(obj.relationships).forEach(([key, value]) => {
    if(resource[key] == null) {
      console.warn(`Undefined relationship in model, got relationship key[ ${key} ], skipping`);
      return;
    }

    if(resource[key].type == 'has-one') {
      if(value.data instanceof Array) {
        console.warn(`Resource relationship defined as hasOne but got hasMany`);
        return;
      }
      // Check if this item is already resolved
      const item = this.findItem(value.data.type, value.data.id);
      if(item != null) {
        obj.relationships[key].data = item;
      }else {
        promises.push(this.find(value.data.type, value.data.id));
      }
    }

    if(resource[key].type == 'has-many') {
      if(!(value.data instanceof Array)) {
        console.warn(`Resource relationship defined as hasMany but got hasOne ${key}`);
        return;
      }

      value.data.forEach(elem => {
        const item = this.findItem(elem.type, elem.id);
        if(item != null) {
          obj.relationships[key].data = obj.relationships[key].data.filter(x => x.id !== elem.id);
          obj.relationships[key].data.push(item);
        }else {
          promises.push(this.find(elem.type, elem.id));
        }
      })
    }

  });
  if(promises.length === 0) {
    return true;
  }

  const rel = await Promise.all(promises);
  if(rel) {
    return this.resolveRelationships(obj, resource);
  }
}

const createItem = async function(data, resource) {
  // let this._data = {
  //   ...this._data,
  // };

  if(!this._data[resource._name])
    this._data[resource._name] = [];

  let obj = recursiveReplace(data, dashToCamelCase);
  // let obj = data;
  obj._resolved = true;

  // Check for relationships
  if(obj.relationships) {
    await this.resolveRelationships(obj, resource);
  }

  this._data[resource._name].push(obj);
  // this._data = this._data;
}

const recursiveReplace = (data, fn) => {
  if(data instanceof Array) {
    return data.map(item => recursiveReplace(item, fn));
  }

  let obj = {};
  Object.entries(data).forEach(([key, value]) => {
    if(types.isObject(value)) {
      return obj[fn(key)] = recursiveReplace(value, fn);
    }
    return obj[fn(key)] = value;
  });

  return obj;
}

const camelCaseToDash = str =>
    str.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').toLowerCase();

const dashToCamelCase = str =>
    str.replace(/-([a-z])/g, g => g[1].toUpperCase());


const find = function(type, id) {

  if(type == null || id == null)
    throw new Error(`function find requires (type, id)`);

  if(!this.inStore(type))
    throw new Error(`Resource does not exist in store`);

  const res = this._store[type];
  // Check if we have this record

  const item = this.findItem(type, id);

  if(item) {
    if(item._resolved)
      return item;

    return this.getItem(item);
  }


  if(!this._data[type])
    this._data[type] = [];

  let obj = {
    _resolved: false,
    id,
    type,
    url: `${res._host.replace(/\/$/, '')}/${res._path}/${id}`,
  };

  Object.entries(res).forEach(([key, value]) => {
    if(key[0] === '_') return;
    obj[key] = value.default;
  });



  this._data[type].push(obj);
  return this.getItem(obj);
}

const findAll = function(type) {
  if(!type)
    throw new Error(`function find requires (type)`);
  if(!this.inStore(type))
    throw new Error(`Resource does not exist in store`);

  if(!this._data[type])
    this._data[type] = [];

  const res = this._store[type];

  let obj = {
    _resolved: false,
    type,
    url: `${res._host.replace(/\/$/, '')}/${res._path}`,
  };

  return this.getAll(obj);
}


const resource = function(name, template) {
  if(!template)
    throw new Error(`You must provide a template for jsonAPI resource type`);

  const tmpl = {
    ...template,
  };

  if(types.isObject(name)) {
    if(!name.name)
      throw new Error(`Key name required if passing an object as first resource parameter`);
    tmpl._name = name.name;
    tmpl._path = name.path || tmpl._name + 's';
    tmpl._host = name.host || this._options.host;
  }else {
    tmpl._name = name;
    tmpl._path = name + 's';
    tmpl._host = this._options.host;
  }

  if(this.inStore(tmpl._name)) {
    throw new Error(`The resource ${name} has already been defined`);
  }
  this._store[tmpl._name] = tmpl;

  return {
    stringify: () => JSON.stringify(tmpl),
    dump: () => ({...tmpl}),
    find: (id) => this.find(tmpl._name, id),
    findAll: () => this.findAll(tmpl._name),
  };
}

const getModelItem = function(obj, path) {
  const parts = path.split('.');
  // check top-level
  const first = parts[0];

  if(obj[first] && parts.length === 1) {
    return obj[first];
  }

  parts.splice(0,1);
  // Check attributes
  if(obj.attributes && obj.attributes[first]) {
    if(parts.length === 0)
      return obj.attributes[first];
  }
  // Check relationships
  if(obj.relationships && obj.relationships[first]) {
    const i = obj.relationships[first];
    if(parts.length === 0 && i.data) {
      if(i.data instanceof Array)
        return i.data.map(item =>  this.model(item.id, item.type));

      return this.model(i.data.id, i.data.type);
    }
  }
}




const model = function(id, type) {
  const obj = this.findItem(type, id);
  return {
    ...obj,
    get: (path) => this.getModelItem(obj, path),
    save: () => saveModel(obj).bind(this),
    delete: () => deletModel(obj).bind(this),
    update: () => updateModel(obj).bind(this),
  };
}

function saveModel(obj) {
  console.warn("Save not implemented yet")
}
function deleteModel(obj) {
  console.warn("Delete not implemented yet");
}
function updateModel(obj) {
  console.warn("Update not implemented yet");
}


function Store(adapter = null, options = {}) {

  this._store = {};
  this._data = {};
  this._adapter = adapter;

  this._options = {
    host: '/',
    ...options,
  }


  this.resource = resource.bind(this);
  this.find = find.bind(this);
  this.findAll = findAll.bind(this);


  this.findItem = findItem.bind(this);
  this.inStore = inStore.bind(this);

  this.getItem = getItem.bind(this);
  this.getAll = getAll.bind(this);

  this.storeResponse = storeResponse.bind(this);

  this.setItem = setItem.bind(this);
  this.createItem = createItem.bind(this);

  this.model = model.bind(this);
  this.resolveRelationships = resolveRelationships.bind(this);
  this.getModelItem = getModelItem.bind(this);

  return {
    resource: this.resource,
    find: this.find,
    findAll: this.findAll,
    toString: () => JSON.stringify(this._data),
    // Used internally
    inStore: this.inStore,
    findItem: this.findItem,

    checkIntegrity: (resource, data, requiredFields) => {
      let errors = [];
      // Make sure we have the required required fields
      if(data.id == null)
        errors.push('ID Key is required, not found in response');
      if(data.type == null)
        errors.push('Type field is required, not found in response');

      // Check if we are overfetching
      if(data.attributes) {
        Object.keys(data.attributes).forEach(key => {
          if(!resource[key])
            errors.push(`${key} not found in model attributes are you overfetching?`);
        });
      }
      if(data.relationships) {
        Object.keys(data.relationships).forEach(key => {
          if(!resource[key])
            errors.push(`${key} not found in model relationships are you overfetching?`);
        });
      }

      // Check if we are underfetching
      Object.entries(resource).forEach(([key, value]) => {
        if(value.type === 'attribute') {
          if(!data.attributes[key])
            errors.push(`${key} not found in data attributes are you underfetching?`);
        }
        if(value.type === 'has-one') {
          if(!data.relationships[key].data)
            errors.push(`${key} not found in data relationships are you underfetching?`);
          if(!types.isObject(data.relationships[key].data))
            errors.push(`${key} not object type but marked as hasOne is this correct?`);
        }
        if(value.type === 'has-many') {
          if(!data.relationships[key].data)
            errors.push(`${key} not found in data relationships are you underfetching?`);
          if(!(data.relationships[key].data instanceof Array))
            errors.push(`${key} not array type but marked as hasMany is this correct?`);
        }
      });

      // Check if required fields are not empty
      requiredFields.forEach(field => {
        const type = resource[field].type;
        if(type === 'attribute') {
          if(!data.attributes || !data.attributes[field] == null ) {
            errors.push(`attribute [${field}] Marked as required but is null`);
          }
        }
        if(type === 'has-one') {
          if(!data.relationships || !data.relationships[field] == null ) {
            errors.push(`relationship [${field}] Marked as required but is null`);
          }
        }
        if(type === 'has-many') {
          if(!data.relationships || !data.relationships[field] == null ) {
            errors.push(`relationship [${field}] Marked as required but is null`);
          }
        }
      });

      return errors;
    }
  }
}



module.exports = Store;
