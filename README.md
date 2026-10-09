# 迹时 · 让时间流向，更有价值的地方

一个低摩擦记录时间流向的工具。本地优先、断网可用的 Web / PWA 应用，响应式适配手机与桌面，深色底 + 币安金金融科技风。

- 前端：`www.jadebeads.cn`（静态站点，React 构建产物）
- 后端：`api.jadebeads.cn`（Node.js + Express，邮箱验证码 + 账号注册）

## 技术栈

| 领域 | 选型 |
| --- | --- |
| 前端框架 | React 18 + TypeScript + Vite 5 |
| 样式 / 动画 | Tailwind CSS 3 + Framer Motion 11 + Canvas 粒子 |
| 图表 | ECharts 5（桑基 / 河流 / 环形 / 热力图） |
| 本地存储 | IndexedDB（Dexie 4 + dexie-react-hooks） |
| 状态 / 图标 | Zustand 4 + lucide-react |
| 导出 | SheetJS（xlsx） |
| 后端 | Node.js + Express 4 |
| 邮件 | nodemailer（阿里云 DirectMail SMTP） |
| 账号存储 | 本地 JSON（第一版，可换 MySQL） |
| PWA | manifest + Service Worker |

## 目录结构

```
├── index.html
├── public/                    # manifest / sw.js / 图标
├── scripts/gen-icons.mjs      # 图标生成脚本
├── server/                    # 后端（Node.js + Express）
│   ├── package.json
│   ├── .env.example           # 环境变量模板（敏感信息勿提交）
│   └── src/
│       ├── index.js           # 入口
│       ├── mailer.js          # nodemailer 发信
│       ├── store.js           # 账号存储（JSON）
│       └── routes/auth.js     # send-code / register
└── src/                       # 前端源码
    ├── main.tsx / App.tsx
    ├── types.ts / constants.ts / db.ts / store.ts
    ├── utils/                 # time / records / export / auth / charts
    ├── hooks/useReminders.ts
    ├── components/            # 开场动画、粒子按钮、底部导航、各类弹层
    └── pages/                 # 记录 / 统计 / 洞察 / 我的
```

## 快速开始（本地开发）

前端（开发环境验证码走本地模拟，不依赖后端）：

```bash
npm install
npm run dev        # http://localhost:5173
```

后端（可选，仅在联调真实发信时需要）：

```bash
cd server
cp .env.example .env   # 填写 SMTP_PASS 等
npm install
npm run dev            # http://127.0.0.1:3000
```

## 已实现功能（P0）

- **开场动画**：黑屏金色光点呼吸 → 粒子流 → 三句文案（关键词高亮、末句白→金渐变）→ 粒子汇入首页，可跳过
- **记录页**：浮光粒子计时大按钮、今日总时长、四大框架卡片（点击看细分 + 补录）、今日时间线
- **计时**：精确到分钟、IndexedDB 持久化、标签页标题 `[计时中 12:34]` + Media Session
- **归档 / 修改 / 超时提醒 / 睡眠补录 / 价值评分**：均按需求实现
- **统计页**：今日/本周/本月时长、滋养占比、桑基图、河流图、环形图、日历热力图、细分排行
- **我的页**：账号卡片、框架管理、计时与提醒设置、导出 CSV/JSON/Excel、导入 JSON、清空数据、关于
- **邮箱验证码登录**：开发环境本地模拟，生产环境走真实后端发信

## 邮箱验证码说明

- **开发环境**（`npm run dev`，`import.meta.env.DEV === true`）：`src/utils/auth.ts` 走本地模拟，发送后 Toast 直接展示 6 位验证码，方便本地测试。
- **生产环境**（`npm run build` 部署后）：自动请求 `https://api.jadebeads.cn/api/send-code` 与 `/api/register`，由后端通过阿里云 SMTP 真实发信，**不返回、不展示验证码**。
- 后端地址可通过 Vite 环境变量 `VITE_API_BASE` 覆盖（默认 `https://api.jadebeads.cn`）。

> 关于「模板 ID 444380」：阿里云 DirectMail 的模板 ID 仅用于 **SingleSendMail API（模板发信）** 方式。本项目采用 **SMTP 直发（nodemailer）**，邮件内容由服务端直接构造，模板 ID 不参与。若你更倾向走模板发信 API，可另行对接，模板 ID 已保留在 `server/.env.example` 的 `SMTP_TEMPLATE_ID` 中供参考。

---

# 部署到阿里云 ECS

> 以下以 Ubuntu 20.04 / 22.04 为例。域名：前端 `time.jadebeads.cn`，后端 `api.jadebeads.cn`，均需解析到 ECS 公网 IP。

## 1. 安装 Node.js、Nginx、PM2

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Nginx
sudo apt-get update
sudo apt-get install -y nginx

# PM2
sudo npm install -g pm2
```

## 2. 安全组 / 防火墙

在阿里云控制台「安全组」放行：

- 入方向：`80`（HTTP）、`443`（HTTPS）
- 出方向：`465`（阿里云 SMTP 发信端口）

## 3. 拉取代码

```bash
cd /var/www
sudo git clone <你的仓库地址> jishi
cd jishi
```

## 4. 启动后端（端口 3000）

```bash
cd /var/www/jishi/server
cp .env.example .env
vim .env     # 填写 SMTP_PASS（SMTP 密码）等真实配置
npm install

# 用 PM2 常驻运行
pm2 start src/index.js --name jishi-server
pm2 save
pm2 startup   # 按提示执行输出的命令，实现开机自启
```

验证后端：

```bash
curl http://127.0.0.1:3000/api/health
# 应返回 {"status":"ok",...}
```

## 5. 构建前端

```bash
cd /var/www/jishi
npm install
npm run build     # 产物在 dist/
```

## 6. 配置 Nginx 反向代理

创建 `/etc/nginx/conf.d/jishi.conf`：

```nginx
# ===== 前端：静态站点 =====
server {
    listen 80;
    server_name time.jadebeads.cn;

    root /var/www/jishi/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # SPA 路由回退
    }
}

# ===== 后端：反向代理到 3000 端口 =====
server {
    listen 80;
    server_name api.jadebeads.cn;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

生效：

```bash
sudo nginx -t            # 检查配置
sudo systemctl reload nginx
```

## 7. DNS 解析

在域名控制台为 `jadebeads.cn` 添加两条 A 记录：

| 主机记录 | 记录类型 | 记录值 |
| --- | --- | --- |
| time | A | ECS 公网 IP |
| api | A | ECS 公网 IP |

## 8. 配置 HTTPS（推荐，前端 https 请求后端需要）

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d time.jadebeads.cn -d api.jadebeads.cn
# 证书会自动续期（certbot timer）
```

## 9. 后续更新发布

```bash
cd /var/www/jishi
git pull
npm run build                 # 更新前端（Nginx 直接读取 dist）
cd server && git pull 2>/dev/null || cd /var/www/jishi/server
pm2 restart jishi-server      # 重启后端
```

---

# Git 初始化与推送

```bash
# 1. 初始化并提交
git init
git add .
git commit -m "init: 迹时 1.0 前端 + 后端 + 部署配置"

# 2. 在 GitHub 网页上创建空仓库（不要勾选 README/.gitignore，避免冲突）后执行：
git branch -M main
git remote add origin https://github.com/<你的用户名>/<仓库名>.git
git push -u origin main
```

> 注意：`.env`、`node_modules`、`dist`、`server/data` 均已加入 `.gitignore`，不会被提交。`server/.env.example` 会被提交，请勿在其中填写真实密码。

## 数据模型

- `TimeRecord`：startAt / endAt / durationMin / frameworkId / subcategoryId / note / valueScore / source
- `Framework` / `Subcategory`：四大框架与细分领域
- `Settings`：睡眠时段、超时提醒、忘记停止提醒
- 前端数据存于浏览器 `jishi` 数据库（IndexedDB）；后端账号存于 `server/data/users.json`。
