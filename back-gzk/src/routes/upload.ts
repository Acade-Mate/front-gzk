import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // 生成文件名：时间戳-原始文件名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

// 文件过滤器
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('只接受 PDF 文件！'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 限制文件大小为 10MB
  }
});

// 处理上传请求
router.post('/upload-pdf', upload.single('pdf'), (req, res) => {
  try {
    console.log('Received upload request');
    
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ 
        success: false, 
        message: '没有接收到文件' 
      });
    }

    console.log('File received:', req.file);

    // 返回文件信息
    const response = {
      success: true,
      message: '文件上传成功',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      }
    };
    
    console.log('Sending response:', response);
    res.json(response);

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: '文件上传失败' 
    });
  }
});

export { router as uploadRouter }; 