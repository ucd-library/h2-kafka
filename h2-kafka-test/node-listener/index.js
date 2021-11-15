import http2 from 'http2';

const {
  HTTP2_HEADER_PATH,
  HTTP2_HEADER_METHOD
} = http2.constants;
const TOPIC = 'foo';


const session = http2.connect('http://server:3000')

// If there is any error in connecting, log it to the console
session.on('error', (err) => console.error(err))

const req = session.request({ 
  [HTTP2_HEADER_PATH]: '/'+TOPIC, 
  [HTTP2_HEADER_METHOD]: 'POST',
  'authorization' : 'bearer '+process.env.LISTENER_KEY
},{
  endStream: false
});

req.on('response', (headers) => {
  // we can log each response header here
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`)
  }
});

req.on('data', (chunk) => { 
  chunk = JSON.parse(chunk.toString('utf-8').trim());
  console.log(chunk);

  req.write(JSON.stringify({ack:true, id: chunk.id}), 'utf8')
});

req.on('end', () => {
  console.log('end');
  // In this case, we don't want to make any more
  // requests, so we can close the session
  session.close()
})