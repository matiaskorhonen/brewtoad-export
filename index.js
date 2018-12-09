const https = require("https");
const fs = require("fs");

const parameterize = require("parameterize");
const puppeteer = require("puppeteer");

const startURL = process.argv[2];

const exportDir = "./exports";

if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1680,
      height: 1024,
      deviceScaleFactor: 2
    },
    args: ["--start-fullscreen"]
  });

  const page = await browser.newPage();
  await page.setRequestInterception(true);

  page.on("request", interceptedRequest => {
    if (interceptedRequest.url().includes("ads.brewtoad.com")) {
      interceptedRequest.abort();
    } else {
      interceptedRequest.continue();
    }
  });

  await page.goto(startURL);

  const links = await page.evaluate(() => {
    return Array.from(document.querySelectorAll(".recipe-link")).map(
      link => link.href
    );
  });

  for (const link of links) {
    await page.goto(`${link}/print`, { waitUntil: "networkidle2" });

    const title = await page.evaluate(() => {
      return document.querySelector(".header-content h1").textContent;
    });

    const pdf = `${exportDir}/${parameterize(title)}.pdf`;

    console.log(title);

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

    const xmlFilename = `${exportDir}/${parameterize(title)}.xml`;

    const xml = fs.createWriteStream(xmlFilename);

    await https.get(`${link}.xml`, response => {
      response.pipe(xml);
    });

    console.log("  ", xmlFilename);

    const jsonFilename = `${exportDir}/${parameterize(title)}.json`;

    const json = fs.createWriteStream(jsonFilename);

    await https.get(`${link}.json`, response => {
      response.pipe(json);
    });

    console.log("  ", jsonFilename);
  }

  await browser.close();
})();
