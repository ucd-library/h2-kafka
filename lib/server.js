import http2 from 'http2';
import jwt from 'jsonwebtoken';
import config from './config.js';
import {H2KafkaStream} from './stream.js';

const {
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_METHOD,
} = http2.constants;

const server = http2.createServer();

/**
 * Called every time a new h2 connection starts
 */
server.on('stream', async (stream, headers, flags) => {
  const method = headers[HTTP2_HEADER_METHOD];

  // only accept GET paths
  if( method !== 'GET' ) {
    stream.respond({
      [HTTP2_HEADER_STATUS]: 404
    });
    stream.end();
    return;
  }

  // verify jwt
  let token = (headers[config.jwt.header] || '').replace(/^bearer/i, '').trim();
  try {
    token = jwt.verify(token, config.jwt.secret);
  } catch(e) {
    // if something goes wrong, bail out
    stream.respond({
      [HTTP2_HEADER_STATUS]: 403
    });
    stream.end();
    return;
  }

  // TODO: ensure this doesn't hang
  let h2KStream = new H2KafkaStream(token, stream, headers);
  await h2KStream.init();
});

// start main h2-only service
server.listen(config.port, () => {
  console.log('listening on *:'+config.port);
});