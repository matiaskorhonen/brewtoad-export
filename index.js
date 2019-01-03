const https = require("https");
const fs = require("fs");

const axios = require("axios");
const parameterize = require("parameterize");
const puppeteer = require("puppeteer");

const startURL = process.argv[2];
const username = process.argv[3];
const password = process.argv[4];

const exportDir = "./exports";

function interceptor(interceptedRequest) {
  if (
    interceptedRequest.url().includes("ads.brewtoad.com") ||
    interceptedRequest.url().includes("installw.com") ||
    interceptedRequest.url().includes("king.connectioncdn.com") ||
    interceptedRequest.url().includes("google-analytics.com") ||
    interceptedRequest.url().includes("googletagmanager.com") ||
    interceptedRequest.url().includes("maps.google.com") ||
    interceptedRequest.url().includes("googleapis.com") ||
    interceptedRequest.url().includes("abtrcking.com") ||
    interceptedRequest.url().includes("nr-data.net") ||
    interceptedRequest.url().includes("js-agent.newrelic.com")
  ) {
    // console.log("Abort", interceptedRequest.url());
    interceptedRequest.abort();
  } else {
    // console.log("Continue", interceptedRequest.url());
    interceptedRequest.continue();
  }
}

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    devtools: false,
    defaultViewport: {
      width: 1680,
      height: 1024,
      deviceScaleFactor: 2
    },
    timeout: 0,
    args: ["--start-fullscreen"]
  });

  console.log("Opening new page");
  let page = await browser.newPage();

  console.log("Setting up request interception");
  await page.setRequestInterception(true);
  page.on("request", interceptor);

  if (username && password) {
    console.log("Attempting sign-in");
    await page.goto("https://www.brewtoad.com/accounts/sign_in");
    await page.type("#user_login", username);
    await page.type("#user_password", password);

    await Promise.all([
      page.waitForNavigation(), // The promise resolves after navigation has finished
      await page.click("input[type=submit]") // Clicking the button will indirectly cause a navigation
    ]).catch(err => {
      console.log("!!! The sign-in request *may* have failed !!!");
      console.log(
        "  It may also have worked, redirects sometimes hang on brewtoad.com"
      );
      console.log(
        "  Check the recipe results to see if your private recipes were retrieved"
      );
    });
  } else {
    console.log("Skipping sign-in");
  }

  console.log("Retrieving browser cookies");
  const cookies = await page.cookies();

  await page.goto(startURL);
  await page.reload();

  console.log("Retrieving recipe links");
  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".recipe-link")).map(
      link => link.href
    );
  });

  console.log("Starting downloads");
  for (const link of links) {
    await page.goto(`${link}/print`, { waitUntil: "networkidle2" });

    const title = await page.evaluate(() => {
      return document.querySelector(".header-content h1").textContent;
    });

    console.log(title);

    const pdf = `${exportDir}/${parameterize(title)}.pdf`;

    // await page.emulateMedia("screen");
    await page.addStyleTag({
      content: `body, .site-content { background: #fff !important; }
        #js-content > header { background: #fff !important; }
        #js-content > div.soft.centered, #js-content > div.sep { display: none }`
    });
    await page.pdf({
      path: pdf,
      format: "A4",
      displayHeaderFooter: false,
      printBackground: false
    });

    console.log("  ", pdf);

    const cookieStrings = cookies.map(c => `${c.name}=${c.value}`);
    const cookieHeader = cookieStrings.join("; ");

    const xmlFilename = `${exportDir}/${parameterize(title)}.xml`;

    const xml = fs.createWriteStream(xmlFilename);

    const instance = axios.create({
      headers: { Cookie: cookieHeader },
      responseType: "stream"
    });

    await instance
      .get(`${link}.xml`)
      .then(function(response) {
        // handle success
        response.data.pipe(xml);
      })
      .catch(function(error) {
        // handle error
        console.log(error);
      });

    console.log("  ", xmlFilename);

    const jsonFilename = `${exportDir}/${parameterize(title)}.json`;

    const json = fs.createWriteStream(jsonFilename);

    await instance
      .get(`${link}.json`)
      .then(function(response) {
        // handle success
        response.data.pipe(json);
      })
      .catch(function(error) {
        // handle error
        console.log(error);
      });

    console.log("  ", jsonFilename);
  }

  await browser.close();
})();
