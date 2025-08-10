import { test, expect } from "@playwright/test";
import fs from "fs";
import path, { join } from "path";
import csvParser from "csv-parser";
import { filePath } from "../utils/constants";

const inputCSV = filePath.rawDataPath;
const successCSV = filePath.validDataPath;
const failureCSV = filePath.invalidDataPath;
const screenshotDir = join("screenshots");

if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

fs.writeFileSync(successCSV, "article_link,expectedTitle,actualTitle\n", "utf8");
fs.writeFileSync(failureCSV, "article_link,expectedTitle,actualTitle,screenshotPath\n", "utf8");

const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim();

async function readLinksFromCSV() {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(inputCSV)
      .pipe(csvParser({ mapHeaders: ({ header }) => header.trim() }))
      .on("data", (row) => {
        if (row.article_link && row.title) {
          results.push({
            url: row.article_link.trim(),
            expectedTitle: row.title.trim(),
          });
        }
      })
      .on("end", () => resolve(results))
      .on("error", reject);
  });
}

const links = await readLinksFromCSV();

test.describe.parallel("Link Title Verification", () => {
  links.forEach(({ url, expectedTitle }, index) => {
    test(`Check title for ${url} [${index}]`, async ({ page }) => {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      // 1. Try to get first <h1> and compare normalized text
      let h1Text = "";
      try {
        const h1 = await page.locator("h1").first();
        h1Text = await h1.textContent();
      } catch {
        // No <h1> found or error
        h1Text = "";
      }

      if (normalize(h1Text) === normalize(expectedTitle)) {
        // Success by h1 match
        fs.appendFileSync(successCSV, `"${url}","${expectedTitle}","${h1Text}"\n`, "utf8");
        expect(h1Text).toBeTruthy(); // just to have an expect here
        return;
      }

      // 2. If h1 doesn't match, check page title
      const actualTitle = await page.title();

      if (actualTitle === expectedTitle) {
        fs.appendFileSync(successCSV, `"${url}","${expectedTitle}","${actualTitle}"\n`, "utf8");
      } else {
        const safeName = Buffer.from(url).toString("base64").replace(/=+$/, "");
        const screenshotPath = join(screenshotDir, `${safeName}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        fs.appendFileSync(failureCSV, `"${url}","${expectedTitle}","${actualTitle}","${screenshotPath}"\n`, "utf8");
      }

      expect(actualTitle, `Title mismatch for ${url}`).toBe(expectedTitle);
    });
  });
});
