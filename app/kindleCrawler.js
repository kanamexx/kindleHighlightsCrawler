const puppeteer = require('puppeteer');
require('dotenv').config();
const SELECTORS = require('./constants').SELECTORS

const KINDLE_SIGN_IN_URL = process.env.SIGN_IN_URL
const MAIL_ADDRESS = process.env.MAIL_ADDRESS;
const PASSWORD = process.env.PASSWORD;
const ACCEPT_LANGUAGE = process.env.ACCEPT_LANGUAGE;

const WAITING_TIME = 5000;

const config = require('./gcpConfig/config');
const googleCloudAdaptor = require('./adaptor/googleCloudAdaptor');
const bucket = new googleCloudAdaptor.Bucket(config.get('CLOUD_BUCKET'));

const {Readable} = require('stream');

(async() => {
  try {
    // --no-sandbox will make chromium accepte untrusted web content.
    // if you surf the internet but Amazon kindle, check on them.(and decide use this option or not)
    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    // in headless mode, Accept-Language Header will not set in automatically.
    // if you use it as a non-headless browser, you can run it without this.
    await page.setExtraHTTPHeaders({
      'Accept-Language': ACCEPT_LANGUAGE
    })

    await signInByAmazonAccount(page);
    await page.waitFor(WAITING_TIME);
    const result = await getAllBooksInformation(page);
    browser.close();

    const stream = new Readable();
    stream.push(JSON.stringify(result, null, '  '));
    stream.push(null);
    bucket.uploadFile("highlights.json", stream);

    console.log('done.')
    return;
  } catch(e) {
    console.error(e);
  }
})()

async function signInByAmazonAccount(page){
    await page.goto(KINDLE_SIGN_IN_URL, {waitUntil: "domcontentloaded"});
    await page.type(SELECTORS.SIGN_IN.EMAIL, MAIL_ADDRESS);
    await page.type(SELECTORS.SIGN_IN.PASSWORD, PASSWORD);
    await page.click(SELECTORS.SIGN_IN.SUBMIT);
    await page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"});
    // second page
    await page.type(SELECTORS.SIGN_IN.PASSWORD, PASSWORD);
    await page.click(SELECTORS.SIGN_IN.SUBMIT);
    await page.waitFor(WAITING_TIME);
}

async function getAllBooksInformation(page){
  const books = await page.$$(SELECTORS.MAIN.BOOKS);

  const res = [];
  if(!books || books.length <= 0){return res;}

  for(i = 0; i < books.length; i++){
    const bookInformation = await getBookInformation(books[i], page);
    if(!isContainedBook(bookInformation, res)){res.push(bookInformation);}
  }
  return res;
}

/**
 * get title, author name and highlights.
 * @param {ElementHandle} book - the book to be clicked
 * @param {Page} page - current page
 */
async function getBookInformation(book, page){
  await book.click();
  await page.waitFor(WAITING_TIME);

  const url = await page.$eval(SELECTORS.MAIN.URL, asin => {
    return asin.href
  });
  const title = await page.$eval(SELECTORS.MAIN.TITLE, title => {
    return title.textContent;
  });
  const author = await page.$eval(SELECTORS.MAIN.AUTHOR, author => {
    return author.textContent;
  });
  const highlights = await getHighlights(title, page);

  return {
    url: url,
    title: title,
    author: author,
    highlights: highlights,
  };
}

/**
 * check the result contains new book information.
 * @param {*} bookInformation
 * @param {*} resultArray
 */
function isContainedBook(bookInformation, resultArray){
  if(!resultArray || resultArray.length <= 0){return false;}
  return resultArray
    .map(element => {return element.title})
    .includes(bookInformation.title);
}

/**
 * get all highlights and their position in the book.
 * @param {String} title - book title
 * @param {Page} page - current page
 */
async function getHighlights(title, page){
  const positions = await page.$$eval(SELECTORS.MAIN.ANNOTATION_HIGHLIGHT_HEADER, positions => {
    return positions.map(position => {return position.textContent});
  });
  const highlights = await page.$$eval(SELECTORS.MAIN.HIGHLIGHTS, highlights => {
    return highlights.map(highlight => {return highlight.textContent});
  });

  if(!positions || positions.length === 0
    || !highlights || highlights.length === 0){return [];}
  if(positions.length !== highlights.length){
    console.warn(
      `the book(${title}) was skipped\n 
      Retry later or get rid of pictures from highlights`
      );
    return [];
  }

  return positions.map((position, i) => {return {position: position, text: highlights[i]};})
}