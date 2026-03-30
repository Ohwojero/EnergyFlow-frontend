const http = require('http');
const url = process.argv[2] || 'http://localhost:3000';
http.get(url, (res) => {
  console.log('STATUS', res.statusCode);
  console.log('HEADERS', res.headers['content-type']);
  let body = '';
  res.on('data', (chunk) => (body += chunk.toString()));
  res.on('end', () => {
    console.log('LENGTH', body.length);
    console.log('BODY START', body.slice(0, 300));
  });
}).on('error', (err) => {
  console.log('ERROR', err.message);
});
