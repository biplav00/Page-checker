export const API_ENDPOINTS = {
  login: "https://dev-api.yirifi.ai/dashboard/api/auth/login",
};

export const credentials = { email: process.env.USERNAME, password: process.env.PASSWORD };

export const filePath = {
  rawDataPath: "./data/news_data.csv",
  concurrency_limit: 5,
  retry_delay: 20000,
  validDataPath: "./data/valid_links.csv",
  invalidDataPath: "./data/invalid_links.csv",
  updatedDataPath: "./data/updated_data_links.csv",
};
