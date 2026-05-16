const fs = require('fs');
const path = require('path');

// Ported from theoreticalSegmentSelector.ts and theoreticalLapAssembler.ts
function selectBestSegments(laps, segments) {
  const bestSectors = [];
  const segmentGroups = {};

  segments.forEach(seg => {
    const baseId = seg.segment_id.split('_')[0]; 
    if (!segmentGroups[baseId]) segmentGroups[baseId] = [];
    segmentGroups[baseId].push(seg);
  });

  for (const baseId in segmentGroups) {
    const sorted = segmentGroups[baseId].sort((a, b) => a.duration_seconds - b.duration_seconds);
    bestSectors.push(sorted[0]);
  }

  return bestSectors.sort((a, b) => a.start_timestamp - b.start_timestamp);
}

function assembleTheoreticalLap(telemetry, bestSectors) {
  const resultTelemetry = [];
  let currentTimestamp = 0;

  bestSectors.forEach(seg => {
    const slice = telemetry.filter(t => t.timestamp >= seg.start_timestamp && t.timestamp <= seg.end_timestamp);
    const sliceStart = slice[0].timestamp;

    slice.forEach(t => {
      resultTelemetry.push({
        ...t,
        original_timestamp: t.timestamp,
        timestamp: currentTimestamp + (t.timestamp - sliceStart),
      });
    });

    currentTimestamp += (seg.end_timestamp - seg.start_timestamp);
  });

  return {
    telemetry: resultTelemetry,
    totalDurationMs: currentTimestamp,
    sectors: bestSectors
  };
}

async function run() {
  const telemetry = JSON.parse(fs.readFileSync('frontend/public/demo/telemetry.json', 'utf8'));
  const laps = JSON.parse(fs.readFileSync('frontend/public/demo/laps.json', 'utf8'));
  const segments = JSON.parse(fs.readFileSync('frontend/public/demo/segments.json', 'utf8'));

  const bestSectors = selectBestSegments(laps, segments);
  const tLap = assembleTheoreticalLap(telemetry, bestSectors);

  fs.writeFileSync('frontend/public/demo/theoretical_best.json', JSON.stringify(tLap, null, 2));
  console.log('✅ Generated theoretical_best.json');
}

run();
