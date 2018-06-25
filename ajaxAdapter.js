const axios = require('axios');


const getItem = (item, options) => new Promise((resolve, reject) => {
  axios.get(item.url)
    .then(resp => resolve(resp.data))
    .catch(err => reject(err));
});
const getAll = (item, options) => new Promise((resolve, reject) => {
  axios.get(item.url)
    .then(resp => resolve(resp.data))
    .catch(err => reject(err));
});
const update = () => new Promise((resolve, reject) => {
  console.warn('Update not implemented yet');
  reject(true);
});
const create = () => new Promise((resolve, reject) => {
  console.warn('Create not implemented yet');
  reject(true);
});

module.exports = {
  getItem,
  getAll,
  update,
  create
}
