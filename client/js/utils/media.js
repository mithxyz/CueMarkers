// Media utility functions
function createObjectURL(file) {
  return URL.createObjectURL(file);
}

function revokeObjectURL(url) {
  URL.revokeObjectURL(url);
}

window.createMediaObjectURL = createObjectURL;
window.revokeMediaObjectURL = revokeObjectURL;
