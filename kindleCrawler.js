const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const SELECTORS = require('./constants').SELECTORS

const KINDLE_SIGN_IN_URL = process.env.SIGN_IN_URL
const MAIL_ADDRESS = process.env.MAIL_ADDRESS;
const PASSWORD = process.env.PASSWORD;
const ACCEPT_LANGUAGE = process.env.ACCEPT_LANGUAGE;

const WAITING_TIME = 5000;

(async() => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    // in headless mode, Accept-Language Header will not set in automatically.
    // if you use it as a non-headless browser, you can run it without this.
    await page.setExtraHTTPHeaders({
      'Accept-Language': ACCEPT_LANGUAGE
    })

    await signInByAmazonAccount(page);
    let result = await getAllBooksInformation(page);
    browser.close();

    fs.writeFile('highlights.json', JSON.stringify(result, null, '  '), "utf-8");
    return;
  } catch(e) {
    console.error(e);
  }
})()

async function signInByAmazonAccount(page){
    // first page
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
  let books = await page.$$(SELECTORS.MAIN.BOOKS);

  let res = [];
  if(!books || books.length <= 0){return res;}

  for(i = 0; i < books.length; i++){
    let bookInformation = await getBookInformation(books[i], page);
    if(!isContainedBook(bookInformation, res)){res.push(bookInformation);}
  }
  return res;
}

/**
 * get title, auther name and highlights.
 * @param {ElementHandle} book - the book to be clicked
 * @param {Page} page - current page
 */
async function getBookInformation(book, page){
  await book.click();
  await page.waitFor(WAITING_TIME);

  let url = await page.$eval(SELECTORS.MAIN.URL, asin => {
    return asin.href
  });
  let title = await page.$eval(SELECTORS.MAIN.TITLE, title => {
    return title.textContent;
  });
  let auther = await page.$eval(SELECTORS.MAIN.AUTHER, auther => {
    return auther.textContent;
  });
  let highlights = await getHighlights(title, page);

  return {
    url: url,
    title: title,
    auther: auther,
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
  let positions = await page.$$eval(SELECTORS.MAIN.ANNOTATION_HIGHLIGHT_HEADER, positions => {
    return positions.map(position => {return position.textContent});
  });
  let highlights = await page.$$eval(SELECTORS.MAIN.HIGHLIGHTS, highlights => {
    return highlights.map(highlight => {return highlight.textContent});
  });

  if(!positions || positions.length === 0
    || !highlights || highlights.length === 0){return [];}
  if(positions.length !== highlights.length){
    console.warn(`the length is not the same.
      positions: ${positions.length}, highlights: ${highlights.length}.\n
      this book(title: ${title}) was skipped`);
    return [];
  }

  return positions.map((position, i) => {return {position: position, text: highlights[i]};})
}