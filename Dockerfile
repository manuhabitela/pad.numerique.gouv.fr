FROM node:lts-slim

ENV PUPPETEER_SKIP_DOWNLOAD=true

EXPOSE 3000

RUN apt-get update && apt-get install -y --no-install-recommends python

WORKDIR /app

COPY package.json yarn.lock .

COPY ./bin/heroku ./bin/heroku

RUN yarn

COPY . .

RUN npm run build

CMD npm run start
