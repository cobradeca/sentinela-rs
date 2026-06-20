const https = require('https');

https.get('https://ykaaxrzkfeaxatrnkkxj.supabase.co/functions/v1/lagoa-monitoramento-historico', (resp) => {
  let data = '';

  // A chunk of data has been received.
  resp.on('data', (chunk) => {
    data += chunk;
  });

  // The whole response has been received. Print out the result.
  resp.on('end', () => {
    console.log(data);
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
