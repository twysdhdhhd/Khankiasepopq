const express = require("express");
const fs = require("fs-extra");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(express.json());

const OUTPUT_DIR = "./rendered_videos";
fs.ensureDirSync(OUTPUT_DIR);

app.post("/convert", async (req, res) => {
  const { lottie_url } = req.body;
  if (!lottie_url) {
    return res.status(400).json({ error: "Lottie URL is required" });
  }

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(lottie_url, { waitUntil: "networkidle2" });
    await page.setViewport({ width: 800, height: 600 });

    const mp4Path = path.join(OUTPUT_DIR, `${uuidv4()}.mp4`);
    
    // Use Puppeteer to record the animation
    await page.evaluate(() => {
      document.body.style.background = "white";
      document.body.style.overflow = "hidden";
    });

    // Record the Lottie animation as a video
    const frames = 240; // 10 seconds at 24fps
    const fps = 24;
    const images = [];

    for (let i = 0; i < frames; i++) {
      await page.evaluate(() => {
        const lottieElement = document.querySelector("lottie-player");
        if (lottieElement) {
          lottieElement.goToAndStop(i);
        }
      });
      const screenshotPath = path.join(OUTPUT_DIR, `frame_${i}.png`);
      await page.screenshot({ path: screenshotPath });
      images.push(screenshotPath);
    }

    await browser.close();

    // Combine frames into an MP4 video using ffmpeg
    const ffmpeg = require("fluent-ffmpeg");
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(path.join(OUTPUT_DIR, "frame_%d.png"))
        .inputFPS(fps)
        .output(mp4Path)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Cleanup frame images
    images.forEach((img) => fs.unlinkSync(img));

    res.json({
      mp4_url: `${req.protocol}://${req.get("host")}/rendered_videos/${path.basename(mp4Path)}`
    });
  } catch (error) {
    res.status(500).json({ error: "Puppeteer failed", details: error.message });
  }
});

// Serve rendered videos
app.use("/rendered_videos", express.static(OUTPUT_DIR));

// Cleanup old files every minute
setInterval(() => {
  fs.readdir(OUTPUT_DIR, (err, files) => {
    if (err) return;
    files.forEach(file => {
      const filePath = path.join(OUTPUT_DIR, file);
      fs.stat(filePath, (err, stats) => {
        if (err) return;
        if (Date.now() - stats.mtimeMs > 60 * 1000) { // 1 minute
          fs.unlink(filePath, () => {});
        }
      });
    });
  });
}, 60 * 1000);

app.listen(8080, () => {
  console.log("Server is running on http://localhost:8080");
});
