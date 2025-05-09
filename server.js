const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const axios = require('axios');
const app = express();

// Serve rendered videos
app.use('/rendered_videos', express.static(path.join(__dirname, 'rendered_videos')));

// Function to download the Lottie JSON from the provided URL
async function downloadLottieJSON(url) {
  const response = await axios.get(url);
  return response.data;
}

// Function to convert Lottie JSON to video using Puppeteer
async function convertLottieToMP4(lottieJson) {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome', // Explicit path to Chromium
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent('<html><body><div id="lottie"></div></body></html>');

  await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.7.6/lottie.min.js' });

  // Inject Lottie animation into page
  await page.evaluate((lottieJson) => {
    const animationData = JSON.parse(lottieJson);
    const animation = lottie.loadAnimation({
      container: document.getElementById('lottie'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData
    });
  }, JSON.stringify(lottieJson));

  // Set up a screenshot or video capture of the rendered animation
  const videoPath = path.join(__dirname, 'rendered_videos', `${uuid.v4()}.mp4`);

  // Capture frames and convert to video (You may need to adjust this part for actual video rendering)
  await page.screenshot({ path: videoPath });

  await browser.close();
  return videoPath;
}

// API route to convert Lottie JSON to MP4
app.post('/convert', express.json(), async (req, res) => {
  const { lottie_url } = req.body;

  if (!lottie_url) {
    return res.status(400).json({ error: 'Lottie URL is required' });
  }

  try {
    const lottieJson = await downloadLottieJSON(lottie_url);
    const mp4Path = await convertLottieToMP4(lottieJson);
    res.json({ mp4_url: `${req.protocol}://${req.get('host')}/rendered_videos/${path.basename(mp4Path)}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
