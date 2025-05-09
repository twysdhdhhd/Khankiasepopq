const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid');
const app = express();

app.use(express.json());

const OUTPUT_DIR = './rendered_videos';
fs.ensureDirSync(OUTPUT_DIR);

// Lottie to MP4 Conversion Function
async function convertLottieToMP4(lottieUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(lottieUrl, { waitUntil: 'networkidle2' });

  const mp4Path = path.join(OUTPUT_DIR, `${uuid.v4()}.mp4`);

  // For demo purposes, we're just taking a screenshot. Replace this with actual rendering logic.
  await page.screenshot({ path: mp4Path.replace('.mp4', '.png') });

  await browser.close();
  return mp4Path;
}

// Convert Route (Use /render if you prefer)
app.post('/render', async (req, res) => {
  const { lottie_url } = req.body;

  if (!lottie_url) {
    return res.status(400).json({ error: 'Lottie URL is required' });
  }

  try {
    const mp4Path = await convertLottieToMP4(lottie_url);

    res.status(200).json({
      mp4_url: `https://lottie-puppeteer.onrender.com/rendered_videos/${path.basename(mp4Path)}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Puppeteer failed', details: error.message });
  }
});

// Serve Rendered Videos
app.use('/rendered_videos', express.static(OUTPUT_DIR));

// Start Server
app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});
