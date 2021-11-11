import config from './config.js';
import {v4 as uuidv4} from 'uuid';
import http2 from 'http2';

import pkg from '@ucd-lib/node-kafka';
const {Consumer, utils} = pkg;

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_STATUS,
  HTTP2_HEADER_CONTENT_TYPE,
} = http2.constants;

class H2KafkaStream {

  constructor(token, stream, headers) {
    this.token = token;
    this.stream = stream;
    this.headers = headers
    this.id = uuidv4();
    this.topic = '';
    this.connected = false;
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
        this._processChunk(chunk)
      } catch(e) {
        console.error(e);
      }
    });

    try {
      this.kafkaConsumer = new Consumer({
        'group.id': this.token[config.jwt.topicProperty],
        'metadata.broker.list': config.kafka.host+':'+config.kafka.port,
        'enable.auto.commit' : false
      },{
        'auto.offset.reset' : this.headers['auto.offset.reset'] || 'earliest',
      });

      await this.kafkaConsumer.connect();
      await this.kafkaConsumer.subscribe([this.topic]);
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

  async next() {
    console.log('Attempting message fetch');

    let msg = await this.kafkaConsumer.consumeOne();
    if( !msg ) return setTimeout(() => this.next(), 100);

    msg = {
      id : utils.getMsgId(msg),
      payload : JSON.parse(msg.value.toString('utf-8'))
    };
    this.write(msg);
  }

  async _processChunk(chunk) {
    let resp = JSON.parse(chunk);
    if( resp.ack !== true ) return;
    console.log('commiting offset');
    await this.kafkaConsumer.commit();
    this.next();
  }

  write(msg) {
    if( typeof msg === 'object' ) msg = JSON.stringify(msg);
    this.stream.write(msg+'\n');
  }
  
}

export { H2KafkaStream }