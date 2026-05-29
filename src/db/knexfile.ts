import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    }
  },
  
  // ... other configs
  //staging: {
  //  client: 'mysql2',
  //  connection: {
  //    database: 'my_db',
  //    user: 'username',
  //    password: 'password'
  //  },
  //  pool: { min: 2, max: 10 },
  //  migrations: { tableName: 'knex_migrations' }
  //},
//
  //production: {
  //  client: 'mysql2',
  //  connection: {
  //    database: 'my_db',
  //    user: 'username',
  //    password: 'password'
  //  },
  //  pool: { min: 2, max: 10 },
  //  migrations: { tableName: 'knex_migrations' }
  //}

};

export default config;