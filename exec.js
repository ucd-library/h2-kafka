const serverType = (process.env.SERVER_TYPE || '').trim().toLocaleLowerCase();

if( serverType === 'ws' ) {
  console.log('Initializing WebSocket via Socket.IO server');
  import('./lib/socket-io/server.js');
} else {
  console.log('Initializing H2 server');
  import('./lib/h2/server.js');
}