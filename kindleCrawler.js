const puppeteer = require('puppeteer')
require('dotenv').config();

const MAIL_ADDRESS = process.env.MAIL_ADDRESS;
const PASSWORD = process.env.PASSWORD;
const KINDLE_LOGIN_URL = 'https://www.amazon.co.jp/ap/signin?openid.return_to=https%3A%2F%2Fread.amazon.co.jp%2Fkp%2Fnotebook%3Fref_%3Dkcr_notebook_lib%26purpose%3DNOTEBOOK%26amazonDeviceType%3DA2CLFWBIMVSE9N%26appName%3Dnotebook&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=amzn_kp_jp&openid.mode=checkid_setup&marketPlaceId=A1VC38T7YXB528&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&pageId=amzn_kp_notebook_us&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0&openid.pape.max_auth_age=1209600&siteState=clientContext%3D357-9612705-6328200%2CsourceUrl%3Dhttps%253A%252F%252Fread.amazon.co.jp%252Fkp%252Fnotebook%253Fref_%253Dkcr_notebook_lib%2526purpose%253DNOTEBOOK%2526amazonDeviceType%253DA2CLFWBIMVSE9N%2526appName%253Dnotebook%2Csignature%3DNaRbTTZlwvNFj5Ft3iE0OEL77Twj3D&language=ja_JP&auth=Customer+is+not+authenticated';

const WAITING_TIME = 5000;
const BOOKS_SELECTOR = '.a-link-normal.a-text-normal:not(.kp-notebook-printable):not(.a-size-base-plus)';
const TITLE_SELECTOR = 'h3.a-spacing-top-small.a-color-base.kp-notebook-selectable.kp-notebook-metadata';
const AUTHER_SELECTOR = 'p.a-spacing-none.a-spacing-top-micro.a-size-base.a-color-secondary.kp-notebook-selectable.kp-notebook-metadata';

!(async() => {
  try {
    const browser = await puppeteer.launch({headless: false, args: ['--window-size=800,1600']});
    const page = await browser.newPage();

    await loginToKindle(page);

    let result = await getAllBooksInformation(page);

    console.log('res', result);
    console.log('res.length', result.length);
    browser.close();
    return result;
  } catch(e) {
    console.error(e);
  }
})()

async function loginToKindle(page){
    await page.goto(KINDLE_LOGIN_URL, {waitUntil: "domcontentloaded"});
    await page.type("#ap_email", MAIL_ADDRESS);
    await page.type("#ap_password", PASSWORD);
    await page.click('#signInSubmit');
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

  let title = await page.$eval(TITLE_SELECTOR, title => {
    return title.textContent;
  });
  let auther = await page.$eval(AUTHER_SELECTOR, auther => {
    return auther.textContent;
  })

  return {
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
  let positions = await page.$$eval('#annotationHighlightHeader', positions => {
    return positions.map(position => {return position.textContent});
  });
  let highlights = await page.$$eval('#highlight', highlights => {
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
