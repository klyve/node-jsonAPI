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

const saveItem = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);
  return new Promise((resolve, reject) => {
      this._adapter.saveItem(this.prepareRequest(item), this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}

const updateItem = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);

  return new Promise((resolve, reject) => {
      this._adapter.updateItem(this.prepareItemRequest(item), this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}

const update = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);
  return new Promise((resolve, reject) => {
      this._adapter.update(item, this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}
const create = function(item) {
  if(!this._adapter)
    throw new Error(`Adapter not found`);
  return new Promise((resolve, reject) => {
      this._adapter.create(item, this._options.headers)
        .then(resp => {
          resolve(this.storeResponse(resp, item));
        }).catch(err => reject(err));
  });
}


const createUrlQuery = (query) => {
    if (query === null) {
        return '';
    }
    let q = '?';
    Object.entries(query).forEach(([key, value]) => {
        if(typeof value === 'object') {
            Object.entries(value).forEach(([k1, v1]) => {
                q += `${key}[${k1}]=${v1}&`;
            })
        }else {
            q += `${key}=${value}&`
        } 
    });
    q = q.slice(0, -1);
    return q;
}


const storeResponse = async function(resp, resource) {
  if(!this.inStore(resource.type))
    throw new Error(`Resource does not exist in store ${resource.type}`);

  const res = this._store[resource.type];
  let relationships = {};
  if(resp.data instanceof Array) {

      const response = await Promise.all(resp.data.map(async (item) => {
        if(this.findItem(item.type, item.id)) {
          await this.setItem(item, res);
        }else {
          await this.createItem(item, res);
        }

        return this.model(item.id, item.type);
      }));

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
  this._data[data.type] = this._data[data.type].filter(elem => elem.id !== data.id);
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
        if(value.data == null) {
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
            if(elem.data == null) {
                return;
            }
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

const constructItem = function(data, resource) {
  if(!this._data[resource._name])
    this._data[resource._name] = [];
    let obj = {attributes: {}, relationships:{}};
    Object.entries(resource).forEach(([key, value]) => {
      if(value.serialize) {
        obj = value.serialize({}, obj, key);
      }
    });
    obj._resolved = false;
    obj.id = null;
    obj.type = resource._name;
    this._data[resource._name].push(obj);
    return obj;
}

const recursiveReplace = (data, fn) => {
  if(data instanceof Array) {
    return data.map(item => recursiveReplace(item, fn));
  }

  let obj = {};
  Object.entries(data).forEach(([key, value]) => {
    if(key[0] === '_') return;
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


const prepareItemRequest = function(data) {
  const obj = this.prepareRequest(data);
  const id = data.id;
  const res = this._store[data.type];

  return {
    ...obj,
    url: `${res._host.replace(/\/$/, '')}/${res._path}/${id}`,
  }
}

const prepareRequest = function(data) {
  const type = data.type;
  const id = data.id;

  if(!this.inStore(type))
    throw new Error(`Resource does not exist in store  ${type}`);

  const res = this._store[type];
  let obj = {
    url: `${res._host.replace(/\/$/, '')}/${res._path}`,
    data: {
      ...recursiveReplace(data, camelCaseToDash),
    },
  };

  return obj;
}

const find = function(type, id, query = null) {

  if(type == null || id == null)
    throw new Error(`function find requires (type, id)`);

  if(!this.inStore(type))
    throw new Error(`Resource does not exist in store  ${type}`);

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
    url: `${res._host.replace(/\/$/, '')}/${res._path}/${id}${createUrlQuery(query)}`,
  };

  Object.entries(res).forEach(([key, value]) => {
    if(key[0] === '_') return;
    obj[key] = value.default;
  });



  this._data[type].push(obj);
  return this.getItem(obj);
}

const findAll = function(type, query = null) {
  if(!type)
    throw new Error(`function find requires (type)`);
  if(!this.inStore(type))
    throw new Error(`Resource does not exist in store  ${type}`);

  if(!this._data[type])
    this._data[type] = [];

  const res = this._store[type];

  let obj = {
    _resolved: false,
    type,
    url: `${res._host.replace(/\/$/, '')}/${res._path}${createUrlQuery(query)}`,
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
    tmpl._path = name.path || tmpl._name;
    tmpl._host = name.host || this._options.host;
  }else {
    tmpl._name = name;
    tmpl._path = name;
    tmpl._host = this._options.host;
    tmpl._path += (tmpl._path[tmpl._path.length-1] !== 's') ? 's' :'' ;
  }



  if(this.inStore(tmpl._name)) {
    throw new Error(`The resource ${name} has already been defined`);
  }
  this._store[tmpl._name] = tmpl;

  return {
    stringify: () => JSON.stringify(tmpl),
    dump: () => ({...tmpl}),
    find: (id, query = null) => this.find(tmpl._name, id, query),
    findAll: (query = null) => this.findAll(tmpl._name, query),
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

const setModelItem = function(obj, path, value) {
  const parts = path.split('.');

  // check top-level
  const first = parts[0];

  if(first in obj && parts.length === 1) {
    obj[first] = value;
  }

  parts.splice(0,1);
  // Check attributes
  if(obj.attributes && first in obj.attributes) {
    if(parts.length === 0)
      obj.attributes[first] = value;
  }

  if(obj.relationships && first in obj.relationships) {
    const i = obj.relationships[first];
    if(parts.length === 0 && i.data) {
      if(i.data instanceof Array) {
        if(!(value instanceof Array))
          value = [value];
        obj.relationships[first] = {
          data: value.map(item => ({id: item.id, type: item.type})),
        };
      }else {
        obj.relationships[first] = {
          data: {id: value.id, type: value.type},
        };
      }
      
    }
  }

  return obj;
}




const model = function(id, type) {
  let obj = null;
  if (id != null)
    obj = this.findItem(type, id);
  else {
    obj = this.constructItem({}, this._store[type])
  }
  
  return {
    ...obj,
    get: (path) => this.getModelItem(obj, path),
    set: (path, value) => this.setModelItem(obj, path, value),
    save: () => {
      if(obj._resolved)
        return updateModel.bind(this)(obj);
      return saveModel.bind(this)(obj);
    },
    delete: () => deletModel.bind(this)(obj),
    update: () => updateModel.bind(this)(obj),
  };
}

const createModel = function(type) {
  return this.model(null, type)
}

function saveModel(obj) {
  return this.saveItem(obj);
}
function updateModel(obj) {
  return this.updateItem(obj);
}

function deleteModel(obj) {
  console.warn("Delete not implemented yet");
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
  this.saveItem = saveItem.bind(this);
  this.updateItem = updateItem.bind(this);

  this.storeResponse = storeResponse.bind(this);

  this.setItem = setItem.bind(this);
  this.createItem = createItem.bind(this);

  this.model = model.bind(this);
  this.resolveRelationships = resolveRelationships.bind(this);
  this.getModelItem = getModelItem.bind(this);
  this.setModelItem = setModelItem.bind(this);
  this.constructItem = constructItem.bind(this);

  this.prepareItemRequest = prepareItemRequest.bind(this);
  this.prepareRequest = prepareRequest.bind(this);

  this.createModel = createModel.bind(this);

  return {
    resource: this.resource,
    find: this.find,
    findAll: this.findAll,
    toString: () => JSON.stringify(this._data),
    create: this.createModel,
    // Used internally
    inStore: this.inStore,
    findItem: this.findItem,

    checkIntegrity: (resource, data, requiredFields) => {
        let errors = [];
        
        if(data == null) return [
            null,
        ];
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
          if(data.attributes[key] === undefined)
            errors.push(`${key} not found in data attributes are you underfetching?`);
        }
        if(value.type === 'has-one') {
          if(!data.relationships[key] || !data.relationships[key].data)
            errors.push(`${key} not found in data relationships are you underfetching?`);
          if(!data.relationships[key] || !types.isObject(data.relationships[key].data))
            errors.push(`${key} not object type but marked as hasOne is this correct?`);
        }
        if(value.type === 'has-many') {
          if(!data.relationships[key] || !data.relationships[key].data)
            errors.push(`${key} not found in data relationships are you underfetching?`);
          if(!data.relationships[key] || !(data.relationships[key].data instanceof Array))
            errors.push(`${key} not array type but marked as hasMany is this correct?`);
        }
      });

      // Check if required fields are not empty
      requiredFields.forEach(field => {
        const type = resource[field].type;
        if(type === 'attribute') {
          if(!data.attributes || !data.attributes[field] === undefined ) {
            errors.push(`attribute [${field}] Marked as required but is null`);
          }
        }
        if(type === 'has-one') {
          if(!data.relationships || !data.relationships[field] === undefined ) {
            errors.push(`relationship [${field}] Marked as required but is null`);
          }
        }
        if(type === 'has-many') {
          if(!data.relationships || !data.relationships[field] === undefined ) {
            errors.push(`relationship [${field}] Marked as required but is null`);
          }
        }
      });

      return errors;
    }
  }
}



module.exports = Store;
