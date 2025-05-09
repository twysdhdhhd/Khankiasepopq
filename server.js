// server.js
const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs-extra");
const path = require("path");

const app = express();
app.use(express.json());

const OUTPUT_DIR = path.join(__dirname, "rendered_videos");
fs.ensureDirSync(OUTPUT_DIR);

// Cleanup old videos every 1 minute
setInterval(() => {
  const files = fs.readdirSync(OUTPUT_DIR);
  const now = Date.now();
  files.forEach(file => {
    const filePath = path.join(OUTPUT_DIR, file);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > 60 * 1000) {
      fs.removeSync(filePath);
      console.log(`Deleted old video: ${file}`);
    }
  });
}, 60 * 1000);

// Lottie to MP4 Rendering Route
app.post("/render", async (req, res) => {
  const { lottie_url } = req.body;
  if (!lottie_url) return res.status(400).json({ error: "Lottie URL is required" });

  try {
    const videoPath = path.join(OUTPUT_DIR, `${Date.now()}.mp4`);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu"
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 500, height: 500 });
    await page.goto("data:text/html,<html><body></body></html>");

    await page.evaluate(async (lottie_url) => {
      const container = document.createElement("div");
      container.style.width = "500px";
      container.style.height = "500px";
      document.body.appendChild(container);

      const animation = await fetch(lottie_url).then(res => res.json());
      const lottiePlayer = await import("https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.9.6/lottie.min.js");
      const anim = lottiePlayer.default.loadAnimation({
        container,
        animationData: animation,
        renderer: "canvas",
        loop: false,
        autoplay: true,
      });

      await new Promise(resolve => anim.addEventListener("complete", resolve));
    }, lottie_url);

    await page.screenshot({ path: videoPath });
    await browser.close();

    res.json({ mp4_url: `${req.protocol}://${req.get("host")}/rendered_videos/${path.basename(videoPath)}` });
  } catch (error) {
    res.status(500).json({ error: "Puppeteer failed", details: error.message });
  }
});

// Serve rendered videos
app.use("/rendered_videos", express.static(OUTPUT_DIR));

// Start server
const PORT = process.env.PORT || 8081;
app.listen(PORT, () => console.log(`Puppeteer service running on port ${PORT}`));
