import config from './config.js';
import {v4 as uuidv4} from 'uuid';
import pkg from '@ucd-lib/node-kafka';
import kafkaCli from './kafka-cli.js';

const {Consumer, utils} = pkg;

class KafkaSocketStream {

  constructor(user, stream, topic='') {
    this.user = user;
    this.stream = stream;
    this.topic = topic;
    this.id = uuidv4();
    this.groupId = this.user[config.jwt.topicProperty];
    
    this.connected = false;
  }

  async initConsumer(consumerConfig) {
    try {
      this.kafkaConsumer = new Consumer({
        'group.id': this.groupId,
        'metadata.broker.list': config.kafka.host+':'+config.kafka.port,
        'enable.auto.commit' : false
      },{
        'auto.offset.reset' : consumerConfig['auto.offset.reset'] || 'earliest',
      });

      await this.kafkaConsumer.connect();
      await this.kafkaConsumer.subscribe([this.topic]);
      await this.kafkaConsumer.client.on('close', () => this.connected = false);
      this.kafkaConsumer.client.on('error', e => this.onError(e));
      this.kafkaConsumer.client.on('event.error', e => this.onError(e));
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
      return false;
    }

    return true;
  }

  async next() {
    try {
      if( !this.connected ) return;

      let msg = await this.kafkaConsumer.consumeOne();
      if( !msg ) return setTimeout(() => this.next(), 100);

      this.currentMsgId = utils.getMsgId(msg);

      msg = {
        id : this.currentMsgId,
        payload : JSON.parse(msg.value.toString('utf-8'))
      };
      this.write(msg);
    } catch(e) {
      this.onError(e);
    }
  }

  onError(e) {
    this.connected = false;
    console.error(e);

    try {
      this.write({
        error: true,
        connected : false,
        topic : this.topic,
        groupId : this.groupId,
        message : e.message
      });
    } catch(e) {}

    this.closeStream();
  }

  async processResponse(msg) {
    console.log(msg);
    if( msg.cmd ) {
      let topic = msg.topic || this.topic;
      if( !this.groupId || !topic ) {
        return this.write({error: true, message: 'topic not set'})
      }
      this.runCmd(topic, msg);
      return;
    }

    if( !this.connected ) return;

    if( typeof msg === 'string' ) {
      msg = JSON.parse(msg.trim());
    }

    if( msg.ack !== true ) {
      this.write({
        error: true,
        id: this.currentMsgId,
        groupId : this.groupId,
        topic : this.topic,
        message : 'no ack=true flag set in response'
      });
      return;
    }

    if( msg.id !== this.currentMsgId ) {
      this.write({
        error: true,
        topic : this.topic,
        groupId : this.groupId,
        id : this.currentMsgId,
        message : 'response message id does not match current id, "'+msg.id+'" != "'+this.currentMsgId+'"'
      });
      return;
    }
    
    await this.kafkaConsumer.client.commit();
    this.next();
  }

  async runCmd(topic, msg) {
    if( !kafkaCli.commands.includes(msg.cmd) ) {
      return this.write({
        error : true,
        message : 'invalid command: '+msg.cmd
      })
    }

    try {
      let resp = await kafkaCli[msg.cmd](this.groupId, topic, msg);
      this.write({
        success : true,
        cmd : msg.cmd,
        topic : this.topicName,
        groupId : this.groupId,
        message : resp.stdout
      });
    } catch(e) {
      this.write({
        error : true,
        cmd : msg.cmd,
        message : e.message
      });
    }
  }


  setErrorStatus() {}

  closeStream() {}

}

export {KafkaSocketStream}