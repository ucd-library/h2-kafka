import http from "http";
import express from "express"
import { Server } from "socket.io";
import { SIOKafkaStream } from "./stream.js";
import config from '../config.js';
import jwt from "jsonwebtoken";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.use((socket, next) => {
  let token = '';
  if( socket.handshake.query && socket.handshake.query.token ) {
    token = socket.handshake.query.token;
  }
  if( !token && socket.handshake.auth && socket.handshake.auth.token ) {
    token = socket.handshake.auth.token;
  }

  if (token){
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if( err ) {
        return next(new Error('Authentication error'));
      }
      socket.token = decoded;
      next();
    });
  } else {
    next(new Error('Authentication error'));
  }   
});
io.on("connection", socket => {
  new SIOKafkaStream(socket);
});

server.listen(config.port, () => {
  console.log('listening on *:'+config.port);
});
