FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /usr/src/app
COPY ./package.json .
RUN npm i
COPY ./*.mjs ./
CMD npm start
