FROM python:3.8

RUN mkdir /service
WORKDIR /service

RUN python -m pip install python-socketio requests websocket-client

COPY index.py .

CMD python index.py