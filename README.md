# open-kafka
HTTP2/WebSocket Interface to Kafka topics with JWT authentication

Websocket interface uses the [Socket.IO](https://socket.io/) library

## Config

 - `PORT`: Port to run server on. Defaults to `3000`
 - `KAFKA_HOST`: Broker hostname to connect to.  Defaults to `kafka`
 - `KAFKA_PORT`: Broker port to connect to. Defaults to `9092`
 - `JWT_SECRET`: Secret to use for JWT authentication
 - `JWT_HEADER` : Http header containing JWT token.  Defaults to `authorization`
 - `JWT_TOPIC_PROPERTY`: Which property in the JWT token should be used for the `group.id`.
 - `SERVER_TYPE`: Either `WS` or `HTTP2`. Defaults to HTTP2

## Usage


### H2 Example

Below is `curl` demo where the `[token]` is the minted JWT token and the path is the `[topic]` you want to connect to.

```bash
curl \
  -i --http2-prior-knowledge \
  -H "authorization: [token]" \
  http://localhost:3000/[topic]
```

Note `--http2-prior-knowledge` is required if connecting via non-https endpoint (H2c).

### WebSocket via Socket.IO example

Below is sample code connecting to a topic using python:

Requirements:

```bash
> python -m pip install python-socketio requests websocket-client
```

Code:

```python
import socketio
import os

sio = socketio.Client()

@sio.event
def connect():
    print('connection established')
    # After you are connected to the Socket.IO, you must send a `config`
    # message setting the topic for the connection.  This can only be 
    # done once
    sio.emit('config', {'topic': 'foo'})

@sio.event
def connect_error(data):
    # If you provide the wrong url or JWT token, you will probably end up here
    print("The connection failed!", data)

@sio.event
def message(data):
    # data messages will always come in with event 'message'
    print('message received with ', data)

    if data.get('error') == True:
      print('Badness!') # something went wrong, check message for additional information
      return

    # The first message will just be the server acknowledging your connection
    # and confirming your connected topic and any topic config
    if data.get('connected') == True and data.get('id') is None:
      return

    # you got a kafka message!
    # DO STUFF HERE

    # then acknowledge the message, be sure to include the message id
    # the server will then send the next message
    sio.emit('message', {'ack': True, 'id': data['id']})

@sio.event
def disconnect():
    print('disconnected from server')

sio.connect(
  'http://server:3000', # set this to currect server url
  auth={'token': os.environ['LISTENER_KEY']} # use the `auth` token param to send JWT token
)
sio.wait()
```