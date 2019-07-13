# kindleCrawler

You can gather highlishts in your kindle books.

## Installation

To use kindleCrawler run:

``` bash
npm install
```

## Usage

All that you have to do is just only 2 step.

* Make `.env` and write as following for setting up your e-mail address, password and language:

```text
MAIL_ADDRESS="YOUR_EMAIL_ADDRESS"
PASSWORD="YOUR_PASSWORD_TO_LOGIN_TO_AMAZON"
SIGN_IN_URL="https://www.amazon.co.jp/ap/signin?clientContext=358-2042842-9631467&openid.return_to=https%3A%2F%2Fread.amazon.co.jp%2Fkp%2Fnotebook%3FamazonDeviceType%3DA2CLFWBIMVSE9N&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=amzn_kp_jp&openid.mode=checkid_setup&marketPlaceId=A1VC38T7YXB528&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=amzn_kp_notebook_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.pape.max_auth_age=1209600&siteState=clientContext%3D355-6570091-5719163%2CsourceUrl%3Dhttps%253A%252F%252Fread.amazon.co.jp%252Fkp%252Fnotebook%253FamazonDeviceType%253DA2CLFWBIMVSE9N%2Csignature%3D9T7B361j2F8aqTCKvYjEazwkmOO2Aj3D&language=en_EN&auth=Customer+is+not+authenticated"
ACCEPT_LANGUAGE="ja,en-US;q=0.9,en;q=0.8"
# add your languages if needed
```

* Run:

```bash
node kindleCrawler.js
```

`highlights.json` will be made.

Or, you can also run kidleCrawler in a docker container:

```bash
sudo docker build -t kindlecrawler .
sudo docker run -v $(pwd):/mount kindlecrawler
```

```bash

export GOOGLE_APPLICATION_CREDENTIALS="/home/kaname/Projects/scraping/googleApplicationCredential.json" \
&& node kindleCrawler.js
```
