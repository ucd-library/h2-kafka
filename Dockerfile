FROM node:16

RUN mkdir /service
WORKDIR /service

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY lib lib
COPY exec.js .

CMD node exec.js