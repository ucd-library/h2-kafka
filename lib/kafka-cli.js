import config from './config.js';
import exec from './exec.js';

class KafkaCli {

  constructor() {
    this.commands = [
      'resetTopicOffsets'
    ]
  }

  resetTopicOffsets(groupId, topicName, args) {
    let location = (args.location || '').trim().toLowerCase();
    if( !['to-earliest', 'to-current', 'to-latest'].includes(location) ) {
      throw new Error('Unknown offset flag: '+location);
    }
    location = '--'+location;

    return exec(`kafka-consumer-groups.sh \
      --bootstrap-server ${config.kafka.host}:${config.kafka.port} \
      --group ${groupId} \
      --topic ${topicName} \
      --reset-offsets \
      ${location} \
      --execute`);
  }

}

const kafkaCli = new KafkaCli();
export default kafkaCli;