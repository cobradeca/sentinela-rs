const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://cobradeca.github.io/sentinela-rs/';
const OUT_DIR = path.join(__dirname, '..', 'public', 'screenshots');

async function generateScreenshots() {
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    console.log(`Created directory: ${OUT_DIR}`);
  }

  console.log(`Launching Puppeteer to capture screenshots of ${TARGET_URL}...`);
  // puppeteer.launch options ensure it runs headless by default
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  console.log('Navigating to page and waiting for network idle...');
  await page.goto(TARGET_URL, { waitUntil: 'networkidle2' });
  
  console.log('Waiting an additional 3 seconds to ensure all map layers and charts load...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Capture Mobile
  const mobilePath = path.join(OUT_DIR, 'mobile-dashboard.png');
  await page.setViewport({ width: 1080, height: 1920 });
  await page.screenshot({ path: mobilePath });
  console.log(`Saved mobile screenshot: ${mobilePath}`);

  // Capture Desktop
  const desktopPath = path.join(OUT_DIR, 'desktop-dashboard.png');
  await page.setViewport({ width: 1920, height: 1080 });
  await page.screenshot({ path: desktopPath });
  console.log(`Saved desktop screenshot: ${desktopPath}`);

  await browser.close();
  console.log('Screenshots captured successfully!');
}

generateScreenshots().catch(err => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
