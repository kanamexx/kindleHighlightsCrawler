// === modules ===
const puppeteer = require('puppeteer');
const fs = require('fs');
require('dotenv').config();

// === sign in settings ===
const MAIL_ADDRESS = process.env.MAIL_ADDRESS;
const PASSWORD = process.env.PASSWORD;
const KINDLE_SIGN_IN_URL = process.env.SIGN_IN_URL

const WAITING_TIME = 5000;

// === selectors ===
// sign in
const EMAIL_SELECTOR = '#ap_email';
const PASSWORD_SELECTOR = '#ap_password';
const SUBMIT_SELECTOR = '#signInSubmit';
// main
const BOOKS_SELECTOR = '.a-link-normal.a-text-normal:not(.kp-notebook-printable):not(.a-size-base-plus)';
const TITLE_SELECTOR = 'h3.a-spacing-top-small.a-color-base.kp-notebook-selectable.kp-notebook-metadata';
const AUTHER_SELECTOR = 'p.a-spacing-none.a-spacing-top-micro.a-size-base.a-color-secondary.kp-notebook-selectable.kp-notebook-metadata';
const ANNOTATION_HIGHLIGHT_HEADER_SELECTOR = '#annotationHighlightHeader';
const HIGHLIGHT_SELECTOR = '#highlight';
const ASIN_SELECTOR = 'a.a-link-normal.kp-notebook-printable.a-text-normal';

!(async() => {
  try {
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();

    await loginToKindle(page);

    let result = await getAllBooksInformation(page);
    fs.writeFile('sample.json', JSON.stringify(result, null, '  '), "utf-8");

    console.log('res', result);
    console.log('res.length', result.length);
    browser.close();
    return result;
  } catch(e) {
    console.error(e);
  }
})()

async function loginToKindle(page){
    await page.goto(KINDLE_SIGN_IN_URL, {waitUntil: "domcontentloaded"});
    await page.type(EMAIL_SELECTOR, MAIL_ADDRESS);
    await page.type(PASSWORD_SELECTOR, PASSWORD);
    await page.click(SUBMIT_SELECTOR);
    await page.waitFor(WAITING_TIME);
}

async function getAllBooksInformation(page){
  let books = await page.$$(BOOKS_SELECTOR);

  let res = [];
  if(!books || books.length === 0){return res;}

  for(i = 0; i < books.length; i++){
    let bookInformation = await getBookInformation(books[i], page);
    if(!IsContainedBook(bookInformation, res)){res.push(bookInformation);}
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

  let url = await page.$eval(ASIN_SELECTOR, asin => {
    return asin.href
  });
  let title = await page.$eval(TITLE_SELECTOR, title => {
    return title.textContent;
  });
  let auther = await page.$eval(AUTHER_SELECTOR, auther => {
    return auther.textContent;
  });

  return {
    url: url,
    title: title,
    auther: auther,
    highlights: await getHighlights(title, page),
  };
}

/**
 * check the result contains new book information.
 * @param {*} bookInformation
 * @param {*} resultArray
 */
function IsContainedBook(bookInformation, resultArray){
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
  let positions = await page.$$eval(ANNOTATION_HIGHLIGHT_HEADER_SELECTOR, positions => {
    return positions.map(position => {return position.textContent});
  });
  let highlights = await page.$$eval(HIGHLIGHT_SELECTOR, highlights => {
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