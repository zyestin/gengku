# 梗库 GENGKU

> AI 驱动的每日工作与生活话题灵感库 — 全程零本地依赖，免费部署

## 这是什么

一个自动生成「梗」（话题、段子、聊天素材）的网站。根据你的工作和生活角色，在不同时段生成不同主题的内容：

| 时段 | 内容比例 | 场景 |
|------|---------|------|
| 工作日 9:30 | 💼 100% 工作 | 上班路上看，到公司和同事聊 |
| 工作日 18:00 | 🌗 50% 工作 + 50% 生活 | 下班切换模式 |
| 周末 9:00 | 🏠 100% 生活 | 和家人、孩子、附近家长聊 |
| 周末 18:00 | 🌙 100% 生活 | 一天结束，和家人聊趣事 |

## 内容方向

### 工作向
- **RN开发** — React Native 新架构、Expo 生态、性能优化、跨平台坑
- **前端技术** — React/Vue/Svelte、CSS 新特性、Vite、TypeScript
- **App开发** — iOS/Android 新特性、上架审核、应用商店政策
- **AI编程** — Cursor/Copilot/TRAE/Claude Code、AI编程实践
- **开发工具** — Git 技巧、VSCode 插件、终端工具、效率工具

### 生活向
- **儿童教育** — 7岁/二年级教育、兴趣班、学习方法、教育政策
- **乒乓球** — 国乒动态、WTT赛事、技术讨论、器材
- **时事热点** — 近期热门新闻、社会话题、科技动态
- **家庭育儿** — 亲子互动、父女关系、家庭幽默、带娃日常
- **生活日常** — 生活妙招、消费避坑、健康、美食、周末活动

## 技术架构

```
GitHub Actions (定时 cron) → Node.js 脚本 → OpenRouter API (AI 生成) → 更新 content.json → git push → Vercel 自动部署
```

全程免费：
- **GitHub Actions** — 免费 2000 分钟/月，每次运行约 30 秒
- **OpenRouter** — DeepSeek 模型约 ¥0.001/次，每月约 ¥0.12；也有免费模型可用
- **Vercel** — 免费静态托管，自动部署

## 部署步骤（5 分钟）

### 1. 创建 GitHub 仓库

将本项目所有文件推送到一个新的 GitHub 仓库：

```bash
git init
git add .
git commit -m "feat: 梗库初始化"
git remote add origin https://github.com/<你的用户名>/gengku.git
git push -u origin main
```

### 2. 获取 OpenRouter API Key

1. 访问 https://openrouter.ai
2. 注册并登录
3. 进入 Keys 页面，创建 API Key
4. 复制 Key（格式：`sk-or-v1-...`）

### 3. 配置 GitHub Secrets

在 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret：

- Name: `OPENROUTER_API_KEY`
- Value: 你的 OpenRouter API Key

（可选）在 Variables 中设置模型：
- Name: `OPENROUTER_MODEL`
- Value: `deepseek/deepseek-chat`（默认，也可用 `google/gemini-2.0-flash-exp:free` 等免费模型）

### 4. 部署到 Vercel

1. 访问 https://vercel.com 并登录（可用 GitHub 账号）
2. 点击 "New Project" → Import 你的 GitHub 仓库
3. Framework Preset 选 "Other"（纯静态）
4. 直接点 "Deploy"
5. 部署完成后获得网址，如 `https://gengku-xxx.vercel.app`

之后每次 GitHub Actions 更新 content.json 并 push，Vercel 会自动重新部署。

### 5. 验证

手动触发一次 GitHub Actions：
- 仓库 → Actions → "每日梗库更新" → Run workflow

等待完成后刷新网页，即可看到新内容。

## 项目结构

```
gengku/
├── index.html                      # 网页（自包含 HTML + CSS + JS）
├── data/
│   └── content.json                # 梗内容数据（AI 自动更新）
├── scripts/
│   └── generate.mjs                # 内容生成脚本（调用 OpenRouter）
├── .github/workflows/
│   └── update-content.yml          # GitHub Actions 定时任务
├── package.json
├── vercel.json                     # Vercel 部署配置
└── README.md
```

## 本地预览

```bash
cd gengku
npx serve .
# 打开 http://localhost:3000
```

## 自定义

### 修改内容方向

编辑 `scripts/generate.mjs` 中的 `DIRECTIONS` 对象。

### 修改时间槽

编辑 `.github/workflows/update-content.yml` 中的 cron 表达式。
时区转换：北京时间 = UTC + 8

### 修改 AI 模型

在 GitHub Variables 中设置 `OPENROUTER_MODEL`：
- `deepseek/deepseek-chat` — 中文质量好，极便宜
- `google/gemini-2.0-flash-exp:free` — 免费
- `anthropic/claude-3.5-haiku` — 质量高，便宜
- `gpt-4o-mini` — OpenAI 经济型

### 修改网页样式

编辑 `index.html` 中的 `:root` CSS 变量。

## License

MIT
