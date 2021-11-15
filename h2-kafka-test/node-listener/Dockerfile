FROM node:16

RUN mkdir /service
WORKDIR /service

COPY index.js .
COPY package.json .

CMD node index.js