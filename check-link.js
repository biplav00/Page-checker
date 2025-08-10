import { chromium } from "playwright";
import { createReadStream, writeFileSync, mkdirSync, existsSync, appendFileSync } from "fs";
import csv from "csv-parser";
import path from "path";
import pLimit from "p-limit";

const normalize = (str) => str?.toLowerCase().replace(/\s+/g, " ").trim();

const ensureDir = (dirPath) => {
  if (!existsSync(dirPath)) mkdirSync(dirPath, { recursive: true });
};

const ensureCSVHeader = (filePath) => {
  if (!existsSync(filePath)) {
    const header = `"URL","Expected Title","Found Title","Matched","Screenshot"\n`;
    writeFileSync(filePath, header, "utf8");
  }
};

function appendToCSV(filePath, row) {
  const csvRow = `"${row.url}","${row.expectedTitle}","${row.foundText}","${row.matched}","${row.screenshot || ""}"\n`;
  appendFileSync(filePath, csvRow, "utf8");
}

function readCSV(filePath) {
  return new Promise((resolve) => {
    const results = [];
    createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results));
  });
}

function getBaseUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

async function checkTitleLogic(page, url, expectedTitle) {
  let foundText = "[NOT FOUND]";
  let matched = false;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });

    // 1. Check first <h1>
    const h1 = await page.locator("h1").first();
    await h1.waitFor({ timeout: 5000 });
    foundText = await h1.textContent();

    if (normalize(foundText) === normalize(expectedTitle)) {
      matched = true;
      return { url, expectedTitle, foundText, matched, botBlocked: false };
    }

    // 2. Check page title
    const pageTitle = await page.title();

    if (pageTitle === expectedTitle) {
      matched = true;
      return { url, expectedTitle, foundText: pageTitle, matched, botBlocked: false };
    }

    // 3. Check if page title matches base URL (bot blocked)
    const baseUrl = getBaseUrl(url);
    if (pageTitle.toLowerCase().includes(baseUrl.toLowerCase())) {
      return { url, expectedTitle, foundText: pageTitle, matched: false, botBlocked: true };
    }

    // No match found
    return { url, expectedTitle, foundText: pageTitle, matched: false, botBlocked: false };
  } catch {
    return { url, expectedTitle, foundText: "[NO MATCH FOUND]", matched: false, botBlocked: false };
  }
}

async function checkAllTitles(rows) {
  const browser = await chromium.launch({ headless: true });
  const limit = pLimit(CONCURRENCY_LIMIT);

  ensureCSVHeader(successCSVPath);
  ensureCSVHeader(failedCSVPath);
  ensureCSVHeader(botBlockedCSVPath);
  ensureDir("./screenshots");

  await Promise.all(
    rows.map((row, index) =>
      limit(async () => {
        const page = await browser.newPage();
        const result = await checkTitleLogic(page, row.article_link, row.title);
        await page.close();

        if (result.botBlocked) {
          appendToCSV(botBlockedCSVPath, result);
          console.log(`🤖 Bot blocked detected: ${result.url}`);
        } else if (result.matched) {
          appendToCSV(successCSVPath, result);
          console.log(`✅ Matched: ${result.url}`);
        } else {
          // Failure - screenshot
          const screenshotPath = `./screenshots/fail_${index}.png`;
          const failurePage = await browser.newPage();
          await failurePage.goto(row.article_link, { waitUntil: "domcontentloaded" });
          await failurePage.screenshot({ path: screenshotPath, fullPage: true });
          await failurePage.close();

          result.screenshot = screenshotPath;
          appendToCSV(failedCSVPath, result);
          console.log(`❌ Mismatch: ${result.url}`);
        }
      })
    )
  );

  await browser.close();
  console.log(`\n✅ Finished processing ${rows.length} rows`);
}

// Filepaths and concurrency (adjust as needed)
const csvFilePath = "./links.csv";
const successCSVPath = "./success.csv";
const failedCSVPath = "./failure.csv";
const botBlockedCSVPath = "./bot_blocked.csv";
const CONCURRENCY_LIMIT = 5;

async function main() {
  const rows = await readCSV(csvFilePath);
  if (rows.length === 0) {
    console.log("✅ No rows to check.");
    return;
  }

  console.log(`\n🔍 Checking ${rows.length} links with concurrency ${CONCURRENCY_LIMIT}...\n`);
  await checkAllTitles(rows);
}

main();
