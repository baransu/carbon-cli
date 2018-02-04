#!/usr/bin/env node

const meow = require("meow");
const puppeteer = require("puppeteer");
const qs = require("query-string");
const globby = require("globby");
const util = require("util");
const fs = require("fs");

const readFile = util.promisify(fs.readFile);

const cli = meow(
  `
    Usage
      $ foo <input>
 
 
    Examples
      $ carbon-cli sources images
`,
  { flags: {} }
);

(async function() {
  const [input] = cli.input;
  carbon(input);
})();

async function carbon(input) {
  if (input) {
    try {
      const allPaths = await globby(input);
      const paths = allPaths.filter(path => !path.includes(".png"));
      console.log(`Found, ${paths.length} files`);

      const browser = await puppeteer.launch();

      await Promise.all(
        paths.map(path =>
          readFile(path).then(content => processFile(browser, content, path))
        )
      );

      await browser.close();
      console.log(`Done, generated ${paths.length} screenshots`);
    } catch (e) {
      await browser.close();
      console.error(e);
    }
  } else {
    console.log("No input specified.");
  }
}

function getLangFromExt(name) {
  const [ext] = name.split(".").reverse();
  return (
    {
      elm: "elm",
      js: "javascript",
      jsx: "jsx"
    }[ext] || "auto"
  );
}

async function processFile(browser, code, name) {
  const l = getLangFromExt(name);

  const options = {
    bg: `rgba(171,184,195,1)`,
    t: "seti", // theme,
    l, // language
    ds: true, // drop shadow
    wc: true, // window controls
    wa: true, // auto adjust width
    pv: "32px",
    ph: "32px",
    // ln: false, // lines
    code
  };
  const url = `https://carbon.now.sh/?${qs.stringify(options)}`;

  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2" });
  page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });

  await screenshotDOMElement(page, {
    selector: "#container-bg",
    path: `${name}.png`
  });
  console.log("Generated screenshot for", name);
}

async function screenshotDOMElement(page, { selector, padding = 0, path }) {
  const rect = await page.evaluate(selector => {
    const element = document.querySelector(selector);
    const { x, y, width, height } = element.getBoundingClientRect();
    return { left: x, top: y, width, height, id: element.id };
  }, selector);

  return await page.screenshot({
    path,
    clip: {
      x: rect.left - padding,
      y: rect.top - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2
    }
  });
}
