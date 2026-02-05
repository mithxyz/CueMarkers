// Audio utility functions
function getMimeFromName(name) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = {
    mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4',
    aac: 'audio/aac', ogg: 'audio/ogg', mp4: 'video/mp4',
    webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska',
  };
  return map[ext] || '';
}

function isVideoFile(file) {
  return /^video\//i.test(file.type) || /\.(mp4|webm|ogg|mov|mkv)$/i.test(file.name);
}

function isAudioFile(file) {
  return /^audio\//i.test(file.type) || /\.(mp3|wav|m4a|aac|ogg)$/i.test(file.name);
}

window.getMimeFromName = getMimeFromName;
window.isVideoFile = isVideoFile;
window.isAudioFile = isAudioFile;
