FROM node:19
WORKDIR /usr/src/app
COPY ./package.json .
RUN npm i
COPY ./*.mjs ./
CMD npm start
