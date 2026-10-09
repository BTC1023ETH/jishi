/**
 * 后端 API 封装
 * - 智能识别（#6）：上传图片/文本 → DeepSeek 返回结构化计划
 * - 开发：直接走同源 /api/*，由 vite 代理到后端 3000
 * - 生产：通过 VITE_API_BASE 注入完整域名（如 https://api.xxx.com）
 */
export interface RecognizedItem {
  start: string; // 'HH:mm'
  end: string;
  title: string;
  subcategoryHint?: string;
}

export interface RecognizeResponse {
  code: number;
  data?: { items: RecognizedItem[] };
  message?: string;
}

/**
 * 推断 API base：
 *   - 运行时 window.__JISHI_API__ 优先
 *   - 构建期 VITE_API_BASE 其次
 *   - 默认同源 '' → 直接走 /api/*（dev 下由 vite 代理；生产需部署同源或设 env）
 */
function apiBase(): string {
  const w = typeof window !== 'undefined' ? (window as unknown as { __JISHI_API__?: string }).__JISHI_API__ : undefined;
  const env = (import.meta.env.VITE_API_BASE as string | undefined) || '';
  return (w || env || '').replace(/\/$/, '');
}

export async function recognizePlan(
  input: { file?: File; text?: string },
  opts?: { signal?: AbortSignal },
): Promise<RecognizedItem[]> {
  const url = `${apiBase()}/api/plan/recognize`;

  let resp: Response;
  if (input.file) {
    const fd = new FormData();
    fd.append('file', input.file);
    resp = await fetch(url, { method: 'POST', body: fd, signal: opts?.signal });
  } else if (input.text != null) {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: input.text }),
      signal: opts?.signal,
    });
  } else {
    throw new Error('请提供 file 或 text');
  }

  if (!resp.ok) {
    throw new Error(`识别接口返回 ${resp.status}`);
  }
  const json = (await resp.json()) as RecognizeResponse;
  if (json.code !== 0) {
    throw new Error(json.message || '识别失败');
  }
  return json.data?.items ?? [];
}
