/**
 * DeepSeek LLM 封装（OpenAI 兼容协议）
 *
 * 使用模型：deepseek-chat（支持视觉理解：可同时传入文本 + 图片 URL / base64）
 * 也可换成其他 OpenAI 兼容服务（修改 BASE_URL 即可）
 */
import OpenAI from 'openai';

let client = null;

function getClient() {
  if (client) return client;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY 未配置（请在 server/.env 中设置）');
  }
  const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  client = new OpenAI({ apiKey, baseURL });
  return client;
}

const SYSTEM_PROMPT = `你是「迹时」App 的智能助理。用户会给你一张图片（课表、计划表、待办清单等），请把图中所有"时间段 + 任务/课程"识别出来，并按以下要求输出：

1. 仅输出严格合法的 JSON（不要任何解释、不要 markdown 代码块标记、不要多余文字）
2. 顶层结构：{ "items": [ { "start": "HH:mm", "end": "HH:mm", "title": "任务名称", "subcategoryHint": "可选，如 工作/学习/健康/生活" } ] }
3. 时间必须为 24 小时制的 HH:mm，跨天时段 end 可写为次日时间（> start 即可，前端会处理）
4. 顺序按开始时间升序
5. 若图中没有可识别的时间段，返回 { "items": [] }
6. 标题尽量保留原文（包括数字/标点），必要时去掉前缀"第几节"`;

const MOCK_RESPONSE = {
  items: [
    { start: '08:00', end: '08:45', title: '数学（必修一）', subcategoryHint: '学习' },
    { start: '08:55', end: '09:40', title: '英语阅读', subcategoryHint: '学习' },
    { start: '10:00', end: '10:45', title: '深度工作：迹时 2.0', subcategoryHint: '工作' },
    { start: '12:00', end: '13:00', title: '午餐 + 散步', subcategoryHint: '健康' },
    { start: '14:00', end: '15:30', title: '项目复盘与下周计划', subcategoryHint: '工作' },
    { start: '16:00', end: '17:00', title: '健身（力量训练）', subcategoryHint: '健康' },
    { start: '20:00', end: '21:30', title: '阅读 / 自由时间', subcategoryHint: '生活' },
  ],
};

/**
 * 识别图片 / 文本为计划项
 * @param {{ dataUrl?: string; text?: string; mime?: string }} input
 * @returns {Promise<{ items: Array<{start:string,end:string,title:string,subcategoryHint?:string}> }>}
 */
export async function recognizePlan(input) {
  // Mock 模式：不发请求
  if ((process.env.PLAN_RECOGNIZE_MOCK || '').toLowerCase() === 'true') {
    return MOCK_RESPONSE;
  }

  const c = getClient();
  const userContent = [];

  if (input.dataUrl) {
    userContent.push({
      type: 'image_url',
      image_url: { url: input.dataUrl },
    });
  }
  userContent.push({
    type: 'text',
    text:
      input.text
        ? `请从下面这段文字里提取时间段+任务：\n\n${input.text}`
        : '请从图片中提取所有时间段+任务。',
  });

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const resp = await c.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  });

  const raw = resp.choices?.[0]?.message?.content || '{"items":[]}';
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed.items)) return { items: parsed.items };
    return { items: [] };
  } catch {
    // 容错：尝试从 markdown 提取
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const parsed = JSON.parse(m[0]);
        if (Array.isArray(parsed.items)) return { items: parsed.items };
      } catch {
        /* ignore */
      }
    }
    return { items: [] };
  }
}
