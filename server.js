const express = require("express");
const fs = require("fs-extra");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");

const app = express();
app.use(express.json());

app.post("/render", async (req, res) => {
    const { lottieUrl } = req.body;
    if (!lottieUrl) {
        return res.status(400).json({ error: "Lottie URL is required" });
    }

    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.goto(lottieUrl, { waitUntil: "networkidle0" });

        const videoPath = path.join(__dirname, `${uuidv4()}.mp4`);

        await page.screenshot({ path: videoPath });
        await browser.close();

        res.json({ mp4_url: `${req.protocol}://${req.get("host")}/${path.basename(videoPath)}` });
    } catch (error) {
        res.status(500).json({ error: "Puppeteer failed", details: error.message });
    }
});

// Static folder for rendered videos
app.use(express.static(path.join(__dirname)));

app.listen(8080, () => {
    console.log("Server is running on http://localhost:8080");
});
