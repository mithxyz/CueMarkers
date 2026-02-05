const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowed = /^(audio|video)\//;
  if (allowed.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio and video files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
});

module.exports = upload;
