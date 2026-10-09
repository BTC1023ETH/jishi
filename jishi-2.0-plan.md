# 迹时 2.0 开发方案（确认稿）

> 基于对现有代码的完整梳理：前端 React 18 + TS + Vite + Tailwind + Dexie(IndexedDB) + Zustand + ECharts；后端 Express（`server/`，已有邮箱验证码注册）；`public/` 已有基础 manifest 与 Service Worker 外壳。

---

## 一、需求确认（10 项逐条核对）

| # | 需求 | 现状 | 2.0 方案 | 确认点 |
|---|------|------|----------|--------|
| 1 | 年份显示 + 日历选日期 | 首页左上角仅显示周几与日期；日期不可点 | 左上角改为「2026 · 10月9日 周五」；首页（计时页顶部日期条）和统计页日期均变为可点击，弹出**移动端友好日历 BottomSheet**（月份切换、今日高亮、快捷"昨天/今天"），选择后定位到该日记录/统计 | ✅ 无歧义 |
| 2 | 导出 Bug | `exportCSV/JSON/Excel` 代码存在但点击无反应。诊断：① 按钮用 `void exportXxx()` 调用，**Promise 异常被静默吞掉**，失败时无任何提示；② XLSX 运行时初始化/依赖加载失败时整条链路中断；③ iOS Safari / WebView 下 Blob 下载兼容性问题 | 修复：所有导出函数加 try/catch + Toast 反馈（成功/失败原因）；统一重写 `downloadBlob`（延迟 `revokeObjectURL`、兜底 `navigator.msSaveBlob`、iOS 长按兼容）；Excel 改为 `XLSX.write` + Blob 而非 `writeFile`，避开其内部下载实现；按钮加 loading 态 | ✅ 无歧义 |
| 3 | 简化时间段调整 | `TimeRangeModal` 交互复杂 | 重做为**两个原生 `type="time"` 输入 + 快捷增减按钮（±5/15/30 分钟）+ 跨天提示**的简洁面板，保留校验（结束>开始、最长 24h） | ✅ 无歧义 |
| 4 | PWA + 后台提示 | 已有 manifest + SW（仅缓存外壳），无安装引导；无 Media Session | ① 升级 SW 缓存策略（stale-while-revalidate，版本号 v2）；② 检测 `beforeinstallprompt`，在"我的"页与首页提供「添加到主屏幕」引导（iOS 单独提示 Safari 分享操作）；③ 计时开始/结束时调用 **Media Session API**：挂一段极短静音音频循环保持后台存活，`metadata` 设置标题「迹时 · 正在计时」+ 当前细分领域，锁屏/状态栏显示播放控件，点暂停即归档入口 | ⚠️ 需确认：iOS Safari 对后台音频限制严格（需用户主动触发播放），方案为"开始计时即自动激活媒体会话"，Android Chrome 完全可用 |
| 5 | 今日计划表 | 无 | 「记录」页顶部新增**可折叠卡片**：默认折叠显示"今日 3 项计划 · 完成 1"；展开后为时间段列表（如 `09:00-10:30 深度工作`），支持手动添加（起止时间 + 任务名 + 可选细分领域），勾选完成，左滑删除；存 Dexie 新表 `plans` | ✅ 无歧义 |
| 6 | 智能识别导入 | 无 | 计划表面板加「拍照/上传」按钮 → 上传图片或 txt/doc → 调后端 `POST /api/plan/recognize` → 后端走「阿里云 OCR → LLM 结构化」流水线 → 返回 `[{start,end,title,subcategoryId?}]` → 前端预览确认后填入计划表。**先以 Mock 模式跑通全流程**（`PLAN_RECOGNIZE_MOCK=true` 时返回模拟数据），真实接入只换环境变量 | ⚠️ 详见第四节服务清单 |
| 7 | 时间线加"事件名称" | 记录仅：时间、细分领域、价值评分、备注 | 数据模型 `TimeRecord` 增加 `eventName?: string` 字段（Dexie schema 升级 v2，向后兼容）；时间线在细分领域与价值评分之间渲染事件名称（无则显示"—"）；归档弹窗与记录详情同步增加输入框 | ✅ 无歧义 |
| 8 | 归档支持自定义事件 | `CategoryPicker` 只能选已有细分 | 归档面板增加「+ 添加自定义事件」：输入名称 + 选所属大框架（默认当前）→ 写入 `subcategories` 表（id: `custom-xxx`）→ 立即选中，同时在「我的 → 框架管理」中可见可管理 | ✅ 无歧义 |
| 9 | 图表特效 | 统计页有河流图 + 桑基图（ECharts） | ① 删除河流图；② 桑基图重做为**自绘 Canvas 粒子流**：左侧"时间"源头持续发射金色粒子，沿贝塞尔曲线路径流向右侧各细分领域节点，粒子颜色 = 领域色，流量 = 时长占比，节点带呼吸光晕，支持触摸/悬停高亮单一路径并显示时长 tooltip。降级：低端机/`prefers-reduced-motion` 时回退静态 ECharts 桑基图 | ✅ 无歧义 |
| 10 | 主页视觉大翻新 | 币安风深色 + 金色，静态 | **先出设计思路（见第三节），确认后实施**。核心计时功能、交互流程、数据层完全不动，只重做视觉层（独立背景组件 + 样式替换） | ⚠️ 待风格确认 |

---

## 二、项目结构变更说明

```
src/
├── components/
│   ├── StarfieldBackground.tsx      ★新增 #10 动态星空背景（Canvas）
│   ├── CursorGlow.tsx               ★新增 #10 鼠标跟随特效
│   ├── CalendarPickerSheet.tsx      ★新增 #1 日历选择器 BottomSheet
│   ├── TimeRangeModal.tsx           ♻重写 #3 简化版时间选择
│   ├── ParticleSankey.tsx           ★新增 #9 离子特效粒子桑基图（Canvas）
│   ├── TodayPlanPanel.tsx           ★新增 #5/#6 今日计划表（含导入入口）
│   ├── PlanImportPreview.tsx        ★新增 #6 OCR 识别结果预览/确认
│   └── CategoryPicker.tsx           ✎修改 #7 事件名称 + #8 自定义事件
├── pages/
│   ├── TimerPage.tsx                ✎修改 #1 年份、#4 Media Session、#10 视觉层
│   ├── RecordPage.tsx               ✎修改 #1 日历、#5 计划表挂载、#7 时间线列
│   ├── StatsPage.tsx                ✎修改 #1 日历、#9 删河流图/换粒子桑基
│   └── ProfilePage.tsx              ✎修改 #2 导出、#4 PWA 安装引导
├── utils/
│   ├── export.ts                    ♻重写 #2 下载逻辑修复
│   ├── mediaSession.ts              ★新增 #4 Media Session 封装
│   └── api.ts                       ★新增 #6 后端请求封装（含 mock 开关）
├── db.ts                            ✎修改 v2 升级：plans 表、eventName 字段
├── types.ts                         ✎修改 Plan 类型、TimeRecord.eventName
└── index.css                        ✎修改 #10 新增视觉 keyframes

server/
├── src/
│   ├── routes/
│   │   ├── auth.js                  （不变）
│   │   └── plan.js                  ★新增 #6 /api/plan/recognize（OCR+LLM，Mock 开关）
│   ├── services/
│   │   ├── ocr.js                   ★新增 阿里云 OCR 封装
│   │   └── llm.js                   ★新增 LLM 结构化封装（通义/Qwen）
│   └── index.js                     ✎修改 挂载新路由
├── .env.example                     ✎修改 补充新变量
└── package.json                     ✎修改 +aliyun sdk +openai sdk

public/
├── sw.js                            ♻升级 v2 缓存策略
└── silence.mp3                      ★新增 #4 静音音频（保持媒体会话）
```

**实施顺序**：第一部分(1-4) → 第二部分(5-8) → 第三部分(9 → 10 待确认后)。每部分完成后可独立验证。

---

## 三、第 10 点视觉设计思路：「赛博星空 · 驾驶舱」

### 设计关键词
`深空黑 #05070D` + `流光金 #F0B90B / #FFD866` + `青蓝辉光 #4A9EFF` · 科技感 · 高动态 · HUD 仪表语言

### 1) 动态星空背景（3 层视差）
- **远景**：Canvas 绘制 200+ 星点，不同大小/亮度，缓慢闪烁（sin 波动透明度）
- **中景**：偶发流星划过（金色拖尾渐隐，每 8~15 秒随机一颗）
- **近景**：金色星尘粒子受"重力"缓慢下沉漂移
- 整体叠加径向渐变暗角 + 顶部一线极光式青金色光带（低透明度、缓慢流动）

### 2) 驾驶舱主仪表（核心计时区）
- 巨大倒计时数字改用 **Orbitron / Rajdhani 风格等宽科技字体**，金色 + 外发光(text-shadow 多层)，数字下方镜面倒影
- 数字外围一圈 **HUD 弧形仪表环**：SVG 圆弧随时间流逝点亮进度，刻度线 + 端点光点
- 当前计时的细分领域以"目标锁定框"样式展示（四角括号 + 微弱扫描线动画）
- 开始/停止按钮：金色能量核心按钮，外圈脉冲光环呼吸动画

### 3) 粒子爆发光晕（计时/交互反馈）
- **开始计时**：按钮位置金色粒子爆发（60~100 粒子放射 + 重力衰减），一圈冲击波光环扩散
- **进行中**：数字底部持续有金色粒子升腾（低速率、优雅不吵闹）
- **停止归档**：粒子汇聚收缩回按钮 → 弹出归档面板
- 基于 Canvas 全屏特效层实现（复用 #9 的粒子引擎），`prefers-reduced-motion` 自动关闭

### 4) 鼠标/触摸跟随特效
- 桌面端：金色辉光光晕跟随鼠标（radial-gradient + blur，轻微拖尾惯性 lerp）
- 移动端：触摸点涟漪 + 短暂粒子散逸
- 列表卡片 hover 时边缘流光描边（金色 gradient border 动画）

### 5) 整体氛围
- 卡片改为**微透明玻璃拟态**（backdrop-blur + 1px 金色 8% 透明描边）
- 页面切换时背景星空轻微加速漂移（营造"推进"感）
- 底部 Tab 栏加入 HUD 风格高亮指示（当前页金色光条 + 辉光）

**性能保障**：全部特效单 Canvas 分层绘制、`requestAnimationFrame` 统一驱动、页面隐藏自动暂停；低端设备（`deviceMemory<4` 或 reduced-motion）降级为静态渐变星空。

---

## 四、第 6 点：后端环境变量与阿里云服务清单

### 需要开通的阿里云服务（3 项）

| 服务 | 用途 | 说明 |
|------|------|------|
| **文字识别 OCR**（通用文字识别） | 图片 → 文字 | 控制台开通"通用文字识别"，有免费额度（每月 200 次），超出约 0.01 元/次；doc 文档则走"通用文档识别" |
| **百炼 DashScope**（通义千问 Qwen） | 文字 → 结构化 JSON | 开通百炼模型服务，创建 **API-KEY**；推荐 `qwen-plus`（便宜且结构化输出稳），也可换 `qwen-max` |
| （可选）**OSS 对象存储** | 大图/文档中转 | 若直接用接口 base64 上传则不需要；图片 >10MB 时建议开 |

> 替代说明：若不想用通义，`llm.js` 采用 **OpenAI 兼容协议**封装，改 `LLM_BASE_URL` + `LLM_API_KEY` + `LLM_MODEL` 三个变量即可无缝切换 DeepSeek / Kimi / GPT 等。

### 后端环境变量（`server/.env`，将同步更新 `.env.example`）

```bash
# ---------- 智能识别（#6） ----------
# 总开关：true = 不调云端，直接返回模拟数据（前端联调用）
PLAN_RECOGNIZE_MOCK=true

# 阿里云 OCR
ALIBABA_CLOUD_ACCESS_KEY_ID=<你的 AccessKey ID>
ALIBABA_CLOUD_ACCESS_KEY_SECRET=<你的 AccessKey Secret>
# OCR 不需单独 key，用主账号/子账号 AccessKey + 已开通服务即可

# 通义千问（DashScope）
DASHSCOPE_API_KEY=<百炼平台申请的 API-KEY>
LLM_MODEL=qwen-plus

# ---- 可选：换其他 OpenAI 兼容大模型 ----
# LLM_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
# LLM_API_KEY=sk-xxx

# 上传限制
PLAN_UPLOAD_LIMIT_MB=10
```

### 接口设计

```
POST /api/plan/recognize
multipart/form-data: { file: 图片/txt/doc }
响应: {
  code: 0,
  data: {
    items: [
      { start: "09:00", end: "10:30", title: "深度工作：迹时开发", subcategoryId: null },
      { start: "10:30", end: "11:00", title: "休息", subcategoryId: "health-repair" }
    ]
  }
}
```
流水线：文件 → OCR 提取文字 → LLM（prompt 约束只输出 JSON）→ 校验时间格式 → 返回。Mock 模式下返回固定课程表示例数据。

**安全建议**：OCR/LLM 的 AccessKey 只放后端，前端永不接触；建议在 RAM 控制台创建**仅开通 OCR 权限的子账号**专用。

---

## 五、待你确认的事项

1. **#4** iOS 后台提示方案（自动激活媒体会话）是否符合预期
2. **#6** 阿里云服务清单是否照此开通（OCR + 百炼）
3. **#10**「赛博星空 · 驾驶舱」设计方向是否 OK，或需调整（如更收敛/更炫）

确认后我将按 第一部分 → 第二部分 → 第三部分 顺序一次性开发完成。
