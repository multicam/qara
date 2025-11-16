#!/usr/bin/env node
import puppeteer from 'puppeteer';

(async () => {
  console.log('🚀 Testing scrolling fix...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📄 Opening http://localhost:5172/');
  await page.goto('http://localhost:5172/', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📌 Clicking agent names to add swim lanes...\n');

  // Find and click agent names in the timeline
  const clicked = await page.evaluate(() => {
    const agentElements = Array.from(document.querySelectorAll('[class*="agent-label"]'));
    const uniqueAgents = agentElements.slice(0, 5); // Click first 5 unique agents

    uniqueAgents.forEach((el, i) => {
      setTimeout(() => el.click(), i * 200);
    });

    return uniqueAgents.length;
  });

  console.log(`✅ Clicked ${clicked} agent labels`);
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Check container after adding agents
  const result = await page.evaluate(() => {
    const container = document.querySelector('.swim-lanes-scroll-container');
    if (!container) return { error: 'Container not found' };

    const computed = window.getComputedStyle(container);
    const swimLanes = container.querySelectorAll('[class*="swim-lane"]');

    return {
      overflowY: computed.overflowY,
      maxHeight: computed.maxHeight,
      height: computed.height,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      swimLaneCount: swimLanes.length,
      isScrollable: container.scrollHeight > container.clientHeight
    };
  });

  console.log('\n📊 Container after adding agents:');
  console.log(JSON.stringify(result, null, 2));

  if (result.isScrollable) {
    console.log('\n✅ SUCCESS! Container is scrollable');
    console.log(`   📏 Content: ${result.scrollHeight}px`);
    console.log(`   📐 Visible: ${result.clientHeight}px`);
    console.log(`   🏊 Lanes: ${result.swimLaneCount}`);

    // Test scrolling
    await page.evaluate(() => {
      const container = document.querySelector('.swim-lanes-scroll-container');
      container.scrollTop = container.scrollHeight / 2;
    });
    console.log('\n🎯 Scrolled container to test functionality');

  } else {
    console.log('\n❌ FAILED: Container still not scrollable');
    console.log(`   Content height: ${result.scrollHeight}px`);
    console.log(`   Container height: ${result.clientHeight}px`);
  }

  console.log('\n⏸️  Browser left open. Press Ctrl+C to close');
  await new Promise(() => {});

})().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
