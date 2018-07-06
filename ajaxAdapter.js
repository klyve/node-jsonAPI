const axios = require('axios');


const getItem = (item, options) => new Promise((resolve, reject) => {
  axios.get(item.url, {headers: {...options}})
    .then(resp => resolve(resp.data))
    .catch(err => reject(err));
});
const getAll = (item, options) => new Promise((resolve, reject) => {
  axios.get(item.url, {headers: {...options}})
    .then(resp => resp.data)
    .then(data => resolve(data))
    .catch(err => reject(err));
});
const saveItem = (item, options) => new Promise((resolve, reject) => {
  axios.post(item.url,{data:{...item.data}}, {headers: {...options}})
    .then(resp => resp.data)
    .then(data => resolve(data))
    .catch(err => reject(err));
});
const updateItem = (item, options) => new Promise((resolve, reject) => {
  axios.patch(item.url,{data:{...item.data}}, {headers: {...options}})
    .then(resp => resp.data)
    .then(data => resolve(data))
    .catch(err => reject(err));
});

module.exports = {
  getItem,
  getAll,
  saveItem,
  updateItem
}
