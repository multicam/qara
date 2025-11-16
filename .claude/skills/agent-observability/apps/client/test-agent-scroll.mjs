#!/usr/bin/env node
import puppeteer from 'puppeteer';

(async () => {
  console.log('🔍 Diagnosing individual agent swimlane scrolling...\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  console.log('📄 Opening http://localhost:5172/');
  await page.goto('http://localhost:5172/', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📌 Adding an agent to see individual swimlane...\n');

  // Click first agent
  await page.evaluate(() => {
    const agentElements = Array.from(document.querySelectorAll('[class*="agent-label"]'));
    if (agentElements[0]) agentElements[0].click();
  });

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Inspect the individual agent swimlane
  const swimlaneInfo = await page.evaluate(() => {
    const swimlane = document.querySelector('.agent-swim-lane');
    if (!swimlane) return { error: 'No agent swimlane found' };

    const chartWrapper = swimlane.querySelector('.chart-wrapper');
    const canvas = swimlane.querySelector('canvas');

    if (!chartWrapper) return { error: 'No chart wrapper found' };

    const wrapperStyle = window.getComputedStyle(chartWrapper);

    return {
      swimlane: {
        className: swimlane.className,
        height: swimlane.offsetHeight,
        scrollHeight: swimlane.scrollHeight,
        overflow: window.getComputedStyle(swimlane).overflow
      },
      chartWrapper: {
        height: chartWrapper.offsetHeight,
        scrollHeight: chartWrapper.scrollHeight,
        clientHeight: chartWrapper.clientHeight,
        overflow: wrapperStyle.overflow,
        overflowY: wrapperStyle.overflowY,
        overflowX: wrapperStyle.overflowX,
        canScroll: chartWrapper.scrollHeight > chartWrapper.clientHeight
      },
      canvas: canvas ? {
        width: canvas.width,
        height: canvas.height,
        styleHeight: canvas.style.height
      } : null
    };
  });

  console.log('📊 Individual Agent Swimlane Structure:');
  console.log(JSON.stringify(swimlaneInfo, null, 2));

  if (swimlaneInfo.chartWrapper && !swimlaneInfo.chartWrapper.canScroll) {
    console.log('\n❌ ISSUE: Chart wrapper is NOT scrollable');
    console.log('   Content height:', swimlaneInfo.chartWrapper.scrollHeight);
    console.log('   Visible height:', swimlaneInfo.chartWrapper.clientHeight);
    console.log('   Overflow-Y:', swimlaneInfo.chartWrapper.overflowY);
    console.log('\n💡 The canvas needs to be taller OR the wrapper needs overflow-y: auto');
  } else if (swimlaneInfo.chartWrapper?.canScroll) {
    console.log('\n✅ Chart wrapper IS scrollable');
  }

  console.log('\n⏸️  Browser left open. Press Ctrl+C to close');
  await new Promise(() => {});

})().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
