FROM node:16

# Install Kafka CLI utils
RUN apt-get update && apt-get install -y openjdk-11-jre
ENV KAFKA_VERSION=2.7.1
ENV KAFKA_URL=https://mirrors.ocf.berkeley.edu/apache/kafka/${KAFKA_VERSION}/kafka_2.13-${KAFKA_VERSION}.tgz
# ENV KAFKA_URL=https://www-eu.apache.org/dist/kafka/${KAFKA_VERSION}/kafka_2.13-${KAFKA_VERSION}.tgz
ENV KAFKA_TEMP_FILE=/opt/kafka.tgz
ENV KAFKA_WORKDIR=/opt/kafka

RUN wget ${KAFKA_URL} -O ${KAFKA_TEMP_FILE}
RUN mkdir -p ${KAFKA_WORKDIR} 
RUN tar -xzpf ${KAFKA_TEMP_FILE} --strip-components=1 -C ${KAFKA_WORKDIR}
RUN rm ${KAFKA_TEMP_FILE}
RUN rm -rf ${KAFKA_WORKDIR}/bin/windows

ENV PATH ${PATH}:/opt/kafka/bin

RUN mkdir /service
WORKDIR /service

COPY package.json .
COPY package-lock.json .
RUN npm install

COPY lib lib
COPY exec.js .

CMD node exec.js