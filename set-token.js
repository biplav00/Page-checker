import axios from "axios";
import fs from "fs";
import path from "path";
import { API_ENDPOINTS, credentials } from "./utils/constants.js";

async function fetchAndStoreTokenAsJson(filePath = "auth/auth_token.json") {
  try {
    const res = await axios.post(API_ENDPOINTS.login, {
      email: credentials.email,
      password: credentials.password,
    });
    console.log(res.data);

    const token = res.data.token || res.data.access_token;

    if (!token) {
      throw new Error("❌ Token not found in response");
    }

    const tokenData = { token };

    fs.writeFileSync(path.resolve(filePath), JSON.stringify(tokenData, null, 2));
    console.log(`✅ Token saved to ${filePath}`);

    return token;
  } catch (error) {
    console.error("❌ Error fetching token:", error.message);
    return null;
  }
}

fetchAndStoreTokenAsJson();
