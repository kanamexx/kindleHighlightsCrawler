FROM ubuntu:18.04
LABEL kanamexx <sonyapple2619@gmail.com>

RUN apt-get update -y && apt-get upgrade -y \
    && apt-get -y install nodejs npm wget

# install the necessary liblaries to make the bundled version of Chromium that Puppeteer installs, work.
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-unstable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /mount
COPY ./app/package.json ./package.json
RUN npm install

CMD ["node", "kindleCrawler.js"]