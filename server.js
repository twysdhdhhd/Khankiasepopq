const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');
const uuid = require('uuid');
const app = express();

app.use(express.json());

const OUTPUT_DIR = './rendered_videos';
fs.ensureDirSync(OUTPUT_DIR);

async function convertLottieToMP4(lottieUrl) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  // Navigate to the Lottie URL
  await page.goto(lottieUrl);

  // Wait for the animation to load and render
  await page.waitForSelector('lottie-player');

  // Take a screenshot of the rendered animation
  const mp4Path = path.join(OUTPUT_DIR, `${uuid.v4()}.mp4`);

  // Set up the Puppeteer command to capture the animation and convert to mp4
  // This part would involve creating frames or recording the animation
  // You may need additional code to render frames from the animation

  // Example placeholder, add the actual rendering code here
  await page.screenshot({ path: `${mp4Path.replace('.mp4', '.png')}` });

  await browser.close();

  return mp4Path;
}

app.post('/convert', async (req, res) => {
  const { lottie_url } = req.body;

  if (!lottie_url) {
    return res.status(400).json({ error: 'Lottie URL is required' });
  }

  try {
    const mp4Path = await convertLottieToMP4(lottie_url);
    
    // Serve the video via URL
    res.status(200).json({ mp4_url: `https://lottie-puppeteer.onrender.com/rendered_videos/${path.basename(mp4Path)}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, () => {
  console.log('Server is running on http://localhost:8080');
});
