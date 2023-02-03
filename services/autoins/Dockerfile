FROM ghcr.io/puppeteer/puppeteer:latest
WORKDIR /usr/src/app
COPY ./package.json .
RUN npm i
COPY ./*.mjs ./
COPY ./cookies.json ./
CMD npm start
