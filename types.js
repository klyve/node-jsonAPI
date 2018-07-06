const isObject = item => item && typeof item === 'object';


const attr = function(name, options) {
  if(isObject(name))
    return attr(null, name);

  return {
    type: 'attribute',
    default: options && options.default,
    serialize: (resource, data, key) => {
      if(!data.attributes)
        throw new Error("Data requires an attributes field");

      const ret = {
        ...data,
      }
      ret.attributes[name || key] = resource[key] || this.default;
      return ret;
    },
    deserialize: (data, key) => data.attributes && data.attributes[name || key],
  }
}


const hasOne = (name, options) => {
  if(isObject(name))
    return hasOne(null, name);

  return {
    type: 'has-one',
    default: options && options.default || {},
    serialize: function(resource, data, key) {
      if(!data.relationships)
        throw new Error("Data requires a relationships field");

      const ret = {
        ...data,
      };

      if(!resource[key]) {
        ret.relationships[name || key] = {data:this.default};
        return ret;
      }

      ret.relationships[name || key] = {
        data: {
          type: resource[key].type,
          id: resource[key].id,
        }
      }
      return ret;
    },

    deserialize: function (data, key) {
      name = name || key;
      if(data.relationships && data.relationships[name]) {
        if(!data.relationships[name].data)
          return null;

        if(!this.resolve)
          throw new Error("No resolve function bound");

        return this.resolve(data.relationships[name].data.type, data.relationships[name].data.id);
      }

    },
  }

}

const hasMany = (name, options) => {
  if(isObject(name))
    return hasOne(null, name);

  return {
    type: 'has-many',
    default: [],
    serialize: function(resource, data, key) {
      if(!data.relationships)
        throw new Error("Data requires a relationships field");

      const ret = {
        ...data,
      };

      if(!resource[key]) {
        ret.relationships[name || key] = {data:this.default};
        return ret;
      }

      ret.relationships[name || key] = {
        data: resource[key].map(item => ({
          type: item.type,
          id: item.id,
        }))
      }

      return ret;
    },
    deserialize: function(data, key) {
      name = name || key;
      if(data.relationships && data.relationships[name]) {
        if(!data.relationships[name].data)
          return [];

        if(!this.resolve)
          throw new Error("No resolve function bound");

        return data.relationships[name].data.map(item => this.resolve(item.type, item.id));
      }
    }
  }
}



module.exports = {
  attr,
  hasOne,
  hasMany,
  isObject,
};
