import http2 from 'http2';
import {KafkaSocketStream} from '../stream.js';


const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
} = http2.constants;

class H2KafkaStream extends KafkaSocketStream {

  constructor(user, stream, headers) {
    super(user, stream);

    this.headers = headers
  }

  async init() {
    let path = this.headers[HTTP2_HEADER_PATH];
    let orgPath = path;

    // decode the path, either checking for a shortcut path are parsing the provided URI 
    try {
      this.topic = decodeURIComponent(path.split('/').pop());
    } catch(e) {
      // if something goes wrong, bail out
      this.stream.respond({
        [HTTP2_HEADER_STATUS]: 500,
        [HTTP2_HEADER_CONTENT_TYPE]: 'application/json'
      });
      this.write({
        error: true,
        path : orgPath,
        topic : this.topic,
        message : e.message
      });
      this.stream.end();
      return;
    }

    this.stream.on('data', chunk => {
      try {
        this.processChunk(chunk)
      } catch(e) {
        console.error(e);
      }
    });

    let success = await this.initConsumer(this.headers);
    if( !success ) return;

    this.stream.on('close', () => {
      this.connected = false;
      this.kafkaConsumer.disconnect();
    });

    // send response headers, h2 style
    this.stream.respond({
      [HTTP2_HEADER_STATUS]: 200,
      [HTTP2_HEADER_CONTENT_TYPE]: 'application/x-ndjson'
    });

    // send connected message so they know all is set
    this.write({
      connected: true, 
      topic: this.topic, 
      'auto.offset.reset' : this.headers['auto.offset.reset'] || 'earliest'
    });
    this.connected = true;

    this.next();
  }

  processChunk(chunk) {
    // TODO: ensure entire JSON newline is in chunk
    this.processResponse(chunk);
  }

  closeStream() {
    this.stream.end();
  }

  setErrorStatus() {
    this.stream.respond({
      [HTTP2_HEADER_STATUS]: 500,
      [HTTP2_HEADER_CONTENT_TYPE]: 'application/json'
    });
  }

  write(msg) {
    if( typeof msg === 'object' ) msg = JSON.stringify(msg);
    this.stream.write(msg+'\n');
  }
  
}

export { H2KafkaStream }