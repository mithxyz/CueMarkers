const { formatTime, formatTimecodeFrames, sanitizeForCsv, xmlEscape } = require('../utils/format');
const JSZip = require('jszip');

function buildJsonExport(project, tracks, cuesByTrack, settings) {
  const result = {
    project: { id: project.id, name: project.name, exportId: project.export_id },
    tracks: tracks.map((track) => ({
      id: track.id,
      name: track.name,
      mediaType: track.media_type,
      duration: track.media_duration,
      cues: (cuesByTrack[track.id] || [])
        .sort((a, b) => a.time - b.time)
        .map((c, i) => ({
          number: i + 1,
          title: c.name || 'Cue',
          description: c.description || '',
          time: c.time,
          timeFormatted: formatTime(c.time),
          fade: Number(c.fade || 0),
          markerColor: c.marker_color || '',
        })),
    })),
    settings: settings || {},
  };
  return JSON.stringify(result, null, 2);
}

function buildCsvExport(project, tracks, cuesByTrack) {
  const fps = 30;
  const headers = ['"Track"', '"Type"', '"Position"', '"Cue No"', '"Label"', '"Fade"'];
  const rows = [];
  for (const track of tracks) {
    const cues = (cuesByTrack[track.id] || []).sort((a, b) => a.time - b.time);
    const trackName = sanitizeForCsv(track.name);
    const typeName = sanitizeForCsv(track.media_type === 'video' ? 'Video' : 'Lighting');
    cues.forEach((c, i) => {
      rows.push(
        `"${trackName}","${typeName}","${sanitizeForCsv(formatTimecodeFrames(c.time, fps))}","${i + 1}","${sanitizeForCsv(c.name || 'Cue')}","${sanitizeForCsv(String(Number(c.fade || 0)))}"`
      );
    });
  }
  return [headers.join(','), ...rows].join('\n');
}

function buildCuepointsCsv(project, tracks, cuesByTrack) {
  const headers = ['Cue #', 'Name', 'Description', 'Time (seconds)', 'Time (MM:SS)', 'Timecode (HH:MM:SS:FF)', 'Fade (seconds)', 'Marker Color', 'Track'];
  const rows = [];
  for (const track of tracks) {
    const cues = (cuesByTrack[track.id] || []).sort((a, b) => a.time - b.time);
    cues.forEach((c, i) => {
      rows.push(
        [
          i + 1,
          sanitizeForCsv(c.name || 'Cue'),
          sanitizeForCsv(c.description || ''),
          c.time.toFixed(3),
          formatTime(c.time),
          formatTimecodeFrames(c.time, 30),
          Number(c.fade || 0),
          c.marker_color || '#ff4444',
          sanitizeForCsv(track.name),
        ]
          .map((v) => `"${v}"`)
          .join(',')
      );
    });
  }
  return [headers.join(','), ...rows].join('\n');
}

function buildMarkdownExport(project, tracks, cuesByTrack) {
  const lines = [];
  lines.push(`# ${project.export_id}_${project.name} - Cue List`);
  lines.push('');
  for (const track of tracks) {
    lines.push(`## ${track.name}`);
    lines.push('');
    lines.push('| # | Title | Time | Fade (s) | Description |');
    lines.push('|---:|---|---:|---:|---|');
    const cues = (cuesByTrack[track.id] || []).sort((a, b) => a.time - b.time);
    cues.forEach((c, i) => {
      const title = (c.name || 'Cue').replace(/\|/g, '\\|');
      const desc = (c.description || '').replace(/\|/g, '\\|');
      lines.push(`| ${i + 1} | ${title} | ${formatTime(c.time)} | ${Number(c.fade || 0)} | ${desc} |`);
    });
    lines.push('');
  }
  return lines.join('\n');
}

function buildMa3Xml(project, tracks, cuesByTrack, settings) {
  const allCues = [];
  for (const track of tracks) {
    const cues = (cuesByTrack[track.id] || []).sort((a, b) => a.time - b.time);
    allCues.push(...cues);
  }
  allCues.sort((a, b) => a.time - b.time);
  if (!allCues.length) return null;

  const exportId = Math.max(1, Number(project.export_id) || 101);
  const s = settings || {};
  const override = !!s.ma3OverrideEnabled;
  const useSeparate = !!s.ma3UseSeparateIds;
  const singleOverrideId = Math.max(1, Number(s.ma3OverrideId) || exportId);
  const seqId = override ? (useSeparate ? Math.max(1, Number(s.ma3SeqId) || singleOverrideId) : singleOverrideId) : exportId;
  const tcId = override ? (useSeparate ? Math.max(1, Number(s.ma3TcId) || singleOverrideId) : singleOverrideId) : exportId;
  const pageId = override ? (useSeparate ? Math.max(1, Number(s.ma3PageId) || singleOverrideId) : singleOverrideId) : exportId;
  const trigger = s.ma3Trigger || 'Go+';
  const base = project.name;
  const duration = Math.max(...tracks.map((t) => t.media_duration || 0), 0);
  const fps = 30;
  const q = (str) => `"${xmlEscape(str)}"`;
  const t3 = (n) => Math.max(0, Number(n) || 0).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  const nowTag = new Date().toISOString().replaceAll('-', 'd').replaceAll(':', 't').slice(0, 19);
  const dpName = `Markers${nowTag}`;
  const macroName = `${exportId}_${base}`;

  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<GMA3 DataVersion="1.4.0.0">');
  lines.push(`  <Macro Name=${q(macroName)}>`);
  lines.push(`    <MacroLine Command=${q('cd root')} Wait="0.01"/>`);
  lines.push(`    <MacroLine Command=${q('Store Appearance "Cue Point Lighting"')}/>`);
  lines.push(`    <MacroLine Command=${q('Set Appearance "Cue Point Lighting" Property Color "1,1,1,0" BackR "83" BackG "18" BackB "24" BackAlpha "221"')}/>`);

  const uniqueColors = [...new Set(allCues.map((c) => (c.marker_color || '').toLowerCase()).filter(Boolean))];
  const colorAppName = (hex) => `Cue Color #${hex.replace(/[^0-9a-f]/gi, '').slice(0, 6).toLowerCase()}`;
  const parseHex = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return { r: 255, g: 68, b: 68 };
    const n = m[1];
    return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
  };
  uniqueColors.forEach((hex) => {
    const { r, g, b } = parseHex(hex);
    const name = colorAppName(hex);
    lines.push(`    <MacroLine Command=${q(`Store Appearance "${name}"`)}/>`);
    lines.push(`    <MacroLine Command=${q(`Set Appearance "${name}" Property Color "1,1,1,0" BackR "${r}" BackG "${g}" BackB "${b}" BackAlpha "221"`)}/>`);
  });

  lines.push(`    <MacroLine Command=${q(`Delete DataPool "${dpName}" /NC`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Store DataPool "${dpName}" /NC`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Delete DataPool "${dpName}" Sequence 1 /NC`)}/>`);

  allCues.forEach((cue, i) => {
    const n = i + 1;
    const fade = Math.max(0, Number(cue.fade || 0));
    const hex = (cue.marker_color || '').toLowerCase();
    const app = hex ? colorAppName(hex) : 'Cue Point Lighting';
    lines.push(`    <MacroLine Command=${q(`Store DataPool "${dpName}" Sequence ${seqId} Cue ${n} /Merge`)}/>`);
    lines.push(`    <MacroLine Command=${q(`DataPool "${dpName}" Sequence ${seqId} Cue ${n} CueFade ${fade}`)}/>`);
    lines.push(`    <MacroLine Command=${q(`Set DataPool "${dpName}" Sequence ${seqId} Cue ${n} Property APPEARANCE "${app}"`)}/>`);
  });
  lines.push(`    <MacroLine Command=${q(`Set  DataPool "${dpName}" Sequence ${seqId} Property APPEARANCE "Cue Point Lighting"`)}/>`);

  lines.push(`    <MacroLine Command=${q('cd root')}/>`);
  lines.push(`    <MacroLine Command=${q(`Store DataPool "${dpName}" Timecode ${tcId}`)}/>`);
  lines.push(`    <MacroLine Command=${q(`cd DataPool "${dpName}" Timecode ${tcId}`)}/>`);
  lines.push(`    <MacroLine Command=${q('Store 1 "Markers"')}/>`);
  lines.push(`    <MacroLine Command=${q('cd 1')}/>`);
  lines.push(`    <MacroLine Command=${q('cd root')}/>`);
  lines.push(`    <MacroLine Command=${q(`cd DataPool "${dpName}"`)}/>`);
  lines.push(`    <MacroLine Command=${q('cd "Timecodes"')}/>`);
  lines.push(`    <MacroLine Command=${q(`set ${tcId} Property FRAMEREADOUT "${fps} fps"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`set ${tcId} Property OFFSETTCSLOT "0"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`set ${tcId} Property DURATION "${t3(duration)}"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`set ${tcId} Property IGNOREFOLLOW "1"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`set ${tcId} Property PLAYBACKANDRECORD "Manual Events"`)}/>`);
  lines.push(`    <MacroLine Command=${q('cd root')}/>`);
  lines.push(`    <MacroLine Command=${q(`cd DataPool "${dpName}" Timecode ${tcId}`)}/>`);
  lines.push(`    <MacroLine Command=${q('cd 1')}/>`);
  lines.push(`    <MacroLine Command=${q(`Assign DataPool "${dpName}" Sequence ${seqId} At 1`)}/>`);
  lines.push(`    <MacroLine Command=${q('cd 1')}/>`);
  lines.push(`    <MacroLine Command=${q('cd 1')}/>`);
  lines.push(`    <MacroLine Command=${q('Store Type "CmdSubTrack" 1')}/>`);
  lines.push(`    <MacroLine Command=${q('cd 1')}/>`);

  allCues.forEach((cue, i) => {
    const n = i + 1;
    lines.push(`    <MacroLine Command=${q(`Store ${n}`)}/>`);
    lines.push(`    <MacroLine Command=${q(`Set ${n} "TIME" "${t3(cue.time)}"`)}/>`);
    lines.push(`    <MacroLine Command=${q(`Set ${n} "TOKEN" "${trigger}"`)}/>`);
  });

  lines.push(`    <MacroLine Command=${q('cd root')}/>`);
  lines.push(`    <MacroLine Command=${q(`cd DataPool "${dpName}"`)}/>`);
  allCues.forEach((_, i) => {
    const n = i + 1;
    lines.push(`    <MacroLine Command=${q(`Assign DataPool ${dpName} Sequence  ${seqId} Cue ${n} At Timecode ${tcId}.1.1.1.1.${n}`)}/>`);
  });

  lines.push(`    <MacroLine Command=${q('cd root')} Wait="0.01"/>`);
  lines.push(`    <MacroLine Command=${q(`Store Page ${pageId}`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Assign DataPool "${dpName}" Sequence ${seqId} At Page ${pageId}.101`)}/>`);
  allCues.forEach((cue, i) => {
    const n = i + 1;
    const title = cue.name || `Cue ${n}`;
    lines.push(`    <MacroLine Command=${q(`Label DataPool "${dpName}" Sequence ${seqId} Cue ${n} "${title}"`)}/>`);
    if (cue.description) {
      lines.push(`    <MacroLine Command=${q(`Set DataPool "${dpName}" Sequence ${seqId} Cue ${n} Property "note" "${cue.description}"`)}/>`);
    }
  });
  lines.push(`    <MacroLine Command=${q(`Label DataPool "${dpName}" Sequence ${seqId} "Lighting ${seqId}"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Label DataPool "${dpName}" Timecode ${tcId} "${base}"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Label Page ${pageId} "${base}"`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Move DataPool "${dpName}" Sequence 1 Thru At Sequence ${seqId}`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Move DataPool "${dpName}" Timecode 1 Thru At Timecode ${tcId}`)}/>`);
  lines.push(`    <MacroLine Command=${q(`Delete DataPool "${dpName}" /NoConfirm`)}/>`);
  lines.push('  </Macro>');
  lines.push('</GMA3>');

  return lines.join('\n');
}

async function buildZipExport(project, tracks, cuesByTrack, settings) {
  const zip = new JSZip();
  const base = project.name;
  const exportId = Math.max(1, Number(project.export_id) || 101);

  zip.file(`${exportId}_${base}.json`, buildJsonExport(project, tracks, cuesByTrack, settings));
  zip.file(`${exportId}_${base}.csv`, buildCsvExport(project, tracks, cuesByTrack));
  zip.file(`${exportId}_${base}_spreadsheet.csv`, buildCuepointsCsv(project, tracks, cuesByTrack));

  const ma3 = buildMa3Xml(project, tracks, cuesByTrack, settings);
  if (ma3) zip.file(`${exportId}_${base}_macro.xml`, ma3);

  zip.file(
    'README.md',
    `# ${exportId}_${base}\n\nGenerated: ${new Date().toLocaleString()}\n`
  );

  return zip.generateAsync({ type: 'nodebuffer' });
}

module.exports = {
  buildJsonExport,
  buildCsvExport,
  buildCuepointsCsv,
  buildMarkdownExport,
  buildMa3Xml,
  buildZipExport,
};
