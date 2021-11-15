import {KafkaSocketStream} from '../stream.js';

class SIOKafkaStream extends KafkaSocketStream {

  constructor(socket) {
    super(socket.token, socket);

    // wait for topic config from user
    this.stream.once('config', msg => this.init(msg));
  }

  async init(topicConfig) {
    // todo, throw error if no topic
    this.topic = topicConfig.topic;

    this.stream.on('message', msg => {
      try {
        this.processResponse(msg)
      } catch(e) {
        console.error(e);
      }
    });

    await this.initConsumer(topicConfig);

    this.stream.on('disconnect', () => {
      this.connected = false;
      this.kafkaConsumer.disconnect();
    });

    // send connected message so they know all is set
    this.write({
      connected: true, 
      topic: this.topic, 
      'auto.offset.reset' : topicConfig['auto.offset.reset'] || 'earliest'
    });
    this.connected = true;

    this.next();
  }


  write(msg) {
    this.stream.emit('message', msg);
  }
  
}

export { SIOKafkaStream }