const env = process.env;

let config = {
  port : parseInt(env.PORT) || 3000,
  
  kafka : {
    host : env.KAFKA_HOST || 'kafka',
    port : env.KAFKA_PORT || '9092'
  },

  socketIO : {
    config : {
      path : env.SOCKET_IO_PATH || '/socket-io/'
    }
  },

  jwt : {
    secret : env.JWT_SECRET || '',
    header : env.JWT_HEADER || 'authorization',
    topicProperty : env.JWT_TOPIC_PROPERTY || 'user'
  }
}

export default config;