import axios from "axios";
import fs from "fs";
import { parse } from "json2csv";

const url = "https://dev-api.yirifi.ai/web3grc/api/news";

const limit = 100; // fetch 500 at a time

// ----------- 1. Fetch One Page -----------
async function fetchNewsPage(page = 1) {
  try {
    const tokenData = JSON.parse(fs.readFileSync("auth/auth_token.json", "utf8"));
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${tokenData.token}`,
        Accept: "application/json",
      },
      params: {
        fields: "title,article_link,status,time_posted",
        page,
        limit,
        // order: "desc",
      },
    });

    return response.data;
  } catch (error) {
    console.error(`❌ Error fetching page ${page}:`, error.response?.data || error.message);
    return { data: [], total: 0 };
  }
}

// ----------- 2. Fetch All Pages -----------
async function fetchAllNews() {
  let allNews = [];
  let page = 1;
  let total = Infinity;

  while (true) {
    const { data, total: totalItems } = await fetchNewsPage(page);

    if (!data || data.length === 0) break;

    if (total === Infinity) {
      total = totalItems;
      console.log(`📊 Total news items to fetch: ${total}`);
    }

    allNews.push(...data);
    console.log(`✅ Fetched page ${page} — Accumulated: ${allNews.length}`);

    if (allNews.length >= total) break;
    page++;
  }

  return allNews;
}

// ----------- 3. Save to CSV -----------
function saveToCSV(data, filename = "news_data.csv") {
  try {
    const csv = parse(data, {
      fields: ["title", "article_link", "status", "time_posted"],
    });
    fs.writeFileSync(filename, csv);
    console.log(`✅ Saved ${data.length} news items to ${filename}`);
  } catch (error) {
    console.error("❌ Error writing to CSV:", error.message);
  }
}

// ----------- 4. Main Function -----------
async function main() {
  const newsData = await fetchAllNews();
  saveToCSV(newsData);
}

main();
