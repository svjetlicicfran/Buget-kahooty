import knex from 'knex';
import config from '../../knexfile.ts';

const db = knex(config.development);

export default db;

//module.exports = db;