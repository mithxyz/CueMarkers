function formatTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(s / 60);
  const remaining = Math.floor(s % 60);
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function formatTimecodeFrames(seconds, fps = 30) {
  const total = Math.max(0, Number(seconds) || 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = Math.floor(total % 60);
  const frames = Math.round((total - Math.floor(total)) * fps);
  return [hours, minutes, secs, Math.min(frames, fps - 1)]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
}

function sanitizeForCsv(value) {
  return String(value ?? '')
    .replace(/[",\n\r\t;]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function xmlEscape(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = { formatTime, formatTimecodeFrames, sanitizeForCsv, xmlEscape };
