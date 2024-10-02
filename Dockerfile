FROM node:lts-alpine

WORKDIR /usr/src/app

COPY . .

RUN npm install

EXPOSE 3000

CMD [ "sh", "-c", "npm run migration:run:dev && npm run start:dev" ]