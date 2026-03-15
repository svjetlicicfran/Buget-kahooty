import type { Knex } from "knex";

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'mysql2',
    connection: {
      host: '127.0.0.1',
      user: 'fsvjetlicic',
      password: '1234',
      database: 'kahootClone'
    }
  },
  
  // ... other configs
  staging: {
    client: 'mysql2',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password'
    },
    pool: { min: 2, max: 10 },
    migrations: { tableName: 'knex_migrations' }
  },

  production: {
    client: 'mysql2',
    connection: {
      database: 'my_db',
      user: 'username',
      password: 'password'
    },
    pool: { min: 2, max: 10 },
    migrations: { tableName: 'knex_migrations' }
  }

};

export default config;