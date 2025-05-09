const express = require("express");
const fs = require("fs-extra");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(express.json());

const OUTPUT_DIR = "./rendered_videos";
fs.ensureDirSync(OUTPUT_DIR);

app.post("/render", async (req, res) => {
  const { lottie_url } = req.body;
  if (!lottie_url) {
    return res.status(400).json({ error: "Lottie URL is required" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/opt/render/.cache/puppeteer/chrome/linux-127.0.6533.88/chrome",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(lottie_url, { waitUntil: "networkidle2" });

    const mp4Path = path.join(OUTPUT_DIR, `${uuidv4()}.mp4`);
    await page.screenshot({ path: mp4Path });

    await browser.close();
    res.json({ mp4_url: `${req.protocol}://${req.get("host")}/rendered_videos/${path.basename(mp4Path)}` });
  } catch (error) {
    res.status(500).json({ error: "Puppeteer failed", details: error.message });
  }
});

app.use("/rendered_videos", express.static(OUTPUT_DIR));

app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
