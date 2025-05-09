const express = require("express");
const fs = require("fs-extra");
const puppeteer = require("puppeteer");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(express.json());

// Directory for storing rendered videos
const OUTPUT_DIR = path.join(__dirname, "rendered_videos");
fs.ensureDirSync(OUTPUT_DIR);

// Convert Lottie to MP4
async function convertLottieToMP4(lottieUrl) {
  const browserFetcher = puppeteer.createBrowserFetcher();
  const revisionInfo = await browserFetcher.download("127.0.6533.88"); // Ensure this version is downloaded

  const browser = await puppeteer.launch({
    executablePath: revisionInfo.executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto(lottieUrl);
  const mp4Path = path.join(OUTPUT_DIR, `${uuidv4()}.mp4`);

  // Render the Lottie to an MP4 using page.screenshot (this is a basic example)
  await page.setViewport({ width: 800, height: 600 });
  await page.screenshot({ path: mp4Path });

  await browser.close();
  return mp4Path;
}

// API route
app.post("/render", async (req, res) => {
  const { lottie_url } = req.body;
  if (!lottie_url) {
    return res.status(400).json({ error: "Lottie URL is required" });
  }

  try {
    const mp4Path = await convertLottieToMP4(lottie_url);
    res.json({
      mp4_url: `${req.protocol}://${req.get("host")}/rendered_videos/${path.basename(mp4Path)}`,
    });

    // Automatically delete the video after 1 minute to save space
    setTimeout(() => fs.remove(mp4Path), 60 * 1000);
  } catch (err) {
    res.status(500).json({ error: "Puppeteer failed", details: err.message });
  }
});

// Serve rendered videos
app.use("/rendered_videos", express.static(OUTPUT_DIR));

// Start the server
app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
