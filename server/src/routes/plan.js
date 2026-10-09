import express from 'express';
import multer from 'multer';
import { recognizePlan } from '../services/llm.js';

const router = express.Router();

// 文件大小限制（默认 10MB），从 env 读取
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.PLAN_UPLOAD_LIMIT_MB || 10) * 1024 * 1024 },
});

/**
 * POST /api/plan/recognize
 *  - multipart: { file: 图片/文档 }   (content-type: multipart/form-data)
 *  - 或 json:   { text: "..." }        (content-type: application/json)
 */
router.post('/recognize', (req, res, next) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res
        .status(400)
        .json({ code: 400, message: err.message || '上传失败', data: { items: [] } });
    }
    try {
      let input = {};
      if (req.file) {
        const mime = req.file.mimetype || 'application/octet-stream';
        const b64 = req.file.buffer.toString('base64');
        input = { dataUrl: `data:${mime};base64,${b64}`, mime };
      } else if (req.body && typeof req.body.text === 'string') {
        input = { text: req.body.text };
      } else {
        return res.status(400).json({
          code: 400,
          message: '请上传文件（file）或在 body 中提供 text 字段',
          data: { items: [] },
        });
      }
      const result = await recognizePlan(input);
      res.json({ code: 0, data: result });
    } catch (e) {
      next(e);
    }
  });
});

export default router;
