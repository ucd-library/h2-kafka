import config from './config.js';
import {v4 as uuidv4} from 'uuid';
import pkg from '@ucd-lib/node-kafka';
const {Consumer, utils} = pkg;

class KafkaSocketStream {

  constructor(user, stream, topic='') {
    this.user = user;
    this.stream = stream;
    this.topic = topic;
    this.id = uuidv4();
    
    this.connected = false;
  }

  async initConsumer(consumerConfig) {
    try {
      this.kafkaConsumer = new Consumer({
        'group.id': this.user[config.jwt.topicProperty],
        'metadata.broker.list': config.kafka.host+':'+config.kafka.port,
        'enable.auto.commit' : false
      },{
        'auto.offset.reset' : consumerConfig['auto.offset.reset'] || 'earliest',
      });

      await this.kafkaConsumer.connect();
      await this.kafkaConsumer.subscribe([this.topic]);
      await this.kafkaConsumer.client.on('close', () => this.connected = false);
    } catch(e) {
      // if something goes wrong, bail out
      this.setErrorStatus();
      this.write({
        error: true,
        path : orgPath,
        topic : this.topic,
        message : e.message
      });
      this.stream.end();
      return;
    }
  }

  async next() {
    if( !this.connected ) return;

    let msg = await this.kafkaConsumer.consumeOne();
    if( !msg ) return setTimeout(() => this.next(), 100);

    this.currentMsgId = utils.getMsgId(msg);

    msg = {
      id : this.currentMsgId,
      payload : JSON.parse(msg.value.toString('utf-8'))
    };
    this.write(msg);
  }

  async processResponse(msg) {
    if( !this.connected ) return;

    if( typeof msg === 'string' ) {
      msg = JSON.parse(msg.trim());
    }

    if( msg.ack !== true ) {
      this.write({
        error: true,
        id: this.currentMsgId,
        topic : this.topic,
        message : 'no ack=true flag set in response'
      });
      return;
    }
    if( msg.id !== this.currentMsgId ) {
      this.write({
        error: true,
        topic : this.topic,
        id : this.currentMsgId,
        message : 'response message id does not match current id, "'+msg.id+'" != "'+this.currentMsgId+'"'
      });
      return;
    }
    
    await this.kafkaConsumer.client.commit();
    this.next();
  }


  setErrorStatus() {}

  closeStream() {}

}

export {KafkaSocketStream}