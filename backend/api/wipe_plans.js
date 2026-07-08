const { Client } = require('pg');

async function run() {
  const client = new Client({ user: 'postgres', password: 'postgres', host: 'localhost', port: 5434, database: 'shared_db' }); 
  await client.connect();
  await client.query('TRUNCATE TABLE subscription_plans CASCADE;');
  console.log('Successfully truncated subscription_plans and its cascades.');
  await client.end();
}

run().catch(console.error);
