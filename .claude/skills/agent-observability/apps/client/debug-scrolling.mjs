#!/usr/bin/env node
/**
 * Debug scrolling issue in observability client
 */
import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Launching browser to diagnose scrolling issue...');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📄 Navigating to http://localhost:5172/');
  await page.goto('http://localhost:5172/', { waitUntil: 'networkidle2' });

  // Wait for page to load
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('\n🔍 Checking swim lane container...');

  // Check if swim lanes exist
  const swimLaneContainer = await page.$('.swim-lanes-scroll-container');
  if (!swimLaneContainer) {
    console.log('❌ No swim lane container found - need to add agents first');

    // Click on some agent names to add them
    console.log('📌 Attempting to click agent names in timeline...');
    const agentTags = await page.$$('[class*="agent"]');
    console.log(`Found ${agentTags.length} potential agent elements`);

  } else {
    console.log('✅ Swim lane container found');

    // Check CSS properties
    const containerInfo = await page.evaluate(() => {
      const container = document.querySelector('.swim-lanes-scroll-container');
      if (!container) return null;

      const computed = window.getComputedStyle(container);
      return {
        overflow: computed.overflow,
        overflowY: computed.overflowY,
        maxHeight: computed.maxHeight,
        height: computed.height,
        scrollHeight: container.scrollHeight,
        clientHeight: container.clientHeight,
        childCount: container.children.length
      };
    });

    console.log('\n📊 Container CSS properties:');
    console.log(JSON.stringify(containerInfo, null, 2));

    // Check if scrolling is possible
    if (containerInfo && containerInfo.scrollHeight > containerInfo.clientHeight) {
      console.log('\n✅ Container IS scrollable');
      console.log(`   Scroll height: ${containerInfo.scrollHeight}px`);
      console.log(`   Client height: ${containerInfo.clientHeight}px`);
    } else {
      console.log('\n❌ Container NOT scrollable');
      if (containerInfo) {
        console.log(`   Scroll height: ${containerInfo.scrollHeight}px`);
        console.log(`   Client height: ${containerInfo.clientHeight}px`);
        console.log('   ⚠️ Content is not taller than container');
      }
    }
  }

  console.log('\n⏸️  Browser left open for manual inspection');
  console.log('   Press Ctrl+C to close');

  // Keep browser open
  await new Promise(() => {});

})().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
