const https = require('https');

const url = 'https://tbiepfclghsrwinqluls.supabase.co/rest/v1';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiaWVwZmNsZ2hzcndpbnFsdWxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODU3MjksImV4cCI6MjA5MzY2MTcyOX0.kSnqzmU40dB2n1V3Qu67r0RVFa3NHU4ROzlRQNZca0A';

function get(path) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    };
    https.get(`${url}/${path}`, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve(data);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  try {
    const motoristas = await get('motoristas?select=*');
    console.log('--- MOTORISTAS ---');
    console.log(JSON.stringify(motoristas, null, 2));

    const assinaturas = await get('assinaturas?select=*');
    console.log('--- ASSINATURAS ---');
    console.log(JSON.stringify(assinaturas, null, 2));

    const fretes = await get('fretes?select=*');
    console.log('--- FRETES ---');
    console.log(JSON.stringify(fretes, null, 2));
  } catch (err) {
    console.error(err);
  }
}

main();
