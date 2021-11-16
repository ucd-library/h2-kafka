import socketio
import os

sio = socketio.Client()

@sio.event
def connect():
    print('connection established')
    sio.emit('message', {'cmd': 'resetTopicOffsets', 'topic': 'foo', 'location': 'to-latest'})

@sio.event
def connect_error(data):
    print("The connection failed!", data)

@sio.event
def message(data):
    print('message received with ', data)

    if data.get('error') == True:
      print('Badness!') # something went wrong, check message for additional information
      return

    if data.get('connected') == True and data.get('id') is None:
      return

    if data.get('cmd') is not None:
      sio.emit('config', {'topic': 'foo'})
      return

    sio.emit('message', {'ack': True, 'id': data['id']})

@sio.event
def disconnect():
    print('disconnected from server')

sio.connect('http://server:3000/', auth={'token': os.environ['LISTENER_KEY']})
sio.wait()