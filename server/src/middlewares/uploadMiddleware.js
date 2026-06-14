const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create upload directories if they don't exist
const createUploadDirs = () => {
  const dirs = [
    'uploads',
    'uploads/profile_pics',
    'uploads/gov_ids',
    'uploads/event_pics'
  ];
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
};

createUploadDirs();

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dest = 'uploads/';
    if (file.fieldname === 'profilePicture') {
      dest += 'profile_pics/';
    } else if (file.fieldname === 'govIdFile') {
      dest += 'gov_ids/';
    } else if (file.fieldname === 'eventImage') {
      dest += 'event_pics/';
    }
    cb(null, path.join(process.cwd(), dest));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // If no file is provided, do not reject (Optional uploads)
  if (!file) {
    return cb(null, true);
  }

  // Define allowed extensions and MIME types
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'];
  const allowedMimetypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = allowedExtensions.includes(ext);
  const isAllowedMime = allowedMimetypes.includes(file.mimetype);

  if (isAllowedExt && isAllowedMime) {
    return cb(null, true);
  } else {
    return cb(new Error('Unsupported file type. Please upload JPG, PNG, PDF, DOC or DOCX.'));
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter
});

module.exports = upload;

