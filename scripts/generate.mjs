import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'content.json');
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

if (!API_KEY) {
  console.error('❌ 缺少 OPENROUTER_API_KEY 环境变量');
  process.exit(1);
}

// ===== 内容方向定义 =====
const DIRECTIONS = {
  work: [
    { category: 'rn',         categoryName: 'RN开发',    desc: 'React Native 新架构(Fabric/TurboModules)、Expo 生态、EAS Build、性能优化、跨平台坑' },
    { category: 'frontend',   categoryName: '前端技术',  desc: 'React/Vue/Svelte 新版本、CSS 新特性、Vite/构建工具、Web标准、TypeScript 趣闻' },
    { category: 'app-dev',    categoryName: 'App开发',   desc: 'iOS/Android 新版本特性、App Store/Google Play 审核政策、上架踩坑、原生交互' },
    { category: 'ai-coding',  categoryName: 'AI编程',    desc: 'Cursor/Copilot/TRAE/Claude Code 新功能对比、AI写代码翻车、AI review代码、AI debug循环、pair programming体验' },
    { category: 'ai-tools',   categoryName: 'AI工具',    desc: 'ChatGPT/Claude/Gemini/Midjourney/SD 新功能对比、AI工具选型、多模型切换、AI生成图片/视频/PPT、AI工具日常使用技巧' },
    { category: 'prompt',     categoryName: 'Prompt工程', desc: '提示词技巧与玄学、token管理与烧钱焦虑、上下文窗口爆炸、system prompt调试、context engineering、few-shot翻车' },
    { category: 'ai-culture', categoryName: 'AI文化',    desc: 'AI焦虑与AI替代工作讨论、AI幻觉一本正经胡说八道、AI伦理争议、AI梗图、"我的token用完了"、AI与人类关系、AGI什么时候来' },
    { category: 'devtools',   categoryName: '开发工具',  desc: 'Git 技巧与翻车、VSCode 插件、终端工具、效率工具、CI/CD' },
  ],
  life: [
    { category: 'ai-life',    categoryName: 'AI生活',    desc: '用AI辅助育儿/教育/辅导作业、AI生成儿童故事、AI做菜谱/旅行攻略、AI帮写家长群回复、AI辅助学习' },
    { category: 'edu',        categoryName: '儿童教育',  desc: '7岁/二年级教育、幼小衔接、兴趣班选择、学习方法、教育政策、辅导作业趣事' },
    { category: 'pingpong',   categoryName: '乒乓球',    desc: '国乒动态、WTT赛事、技术讨论、器材选择、乒乓球文化' },
    { category: 'current',    categoryName: '时事热点',  desc: '近期热门新闻、社会话题、科技动态、AI行业新闻、引发讨论的事件' },
    { category: 'family',     categoryName: '家庭育儿',  desc: '亲子互动、父女关系、家庭幽默、带娃日常、夫妻趣事' },
    { category: 'life',       categoryName: '生活日常',  desc: '生活妙招、消费避坑、健康养生、美食、周末活动、邻里社交' },
  ],
};

// ===== 时段判定 (上海时间 UTC+8) =====
function getCurrentSlot() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 3600 * 1000);
  const day = shanghai.getUTCDay();
  const hour = shanghai.getUTCHours();
  const isWeekend = day === 0 || day === 6;

  const slotId = isWeekend
    ? (hour < 12 ? 'weekend-morning' : 'weekend-evening')
    : (hour < 12 ? 'workday-morning' : 'workday-evening');

  const slotConfig = {
    'workday-morning':   { title: '工作日早间',   ratio: { work: 1, life: 0 }, desc: '上班路上看，到公司和同事聊' },
    'workday-evening':   { title: '工作日晚间',   ratio: { work: 1, life: 1 }, desc: '下班了，工作生活各一半' },
    'weekend-morning':   { title: '周末早晨',     ratio: { work: 0, life: 1 }, desc: '和家人、孩子、附近家长聊' },
    'weekend-evening':   { title: '周末晚间',     ratio: { work: 0, life: 1 }, desc: '和家人聊聊今天的趣事' },
  };

  return { slotId, ...slotConfig[slotId], shanghai };
}

// ===== 构建 Prompt =====
function buildPrompt(slot) {
  const workDirs = DIRECTIONS.work.map(d => `- 【${d.categoryName}】${d.desc}`).join('\n');
  const lifeDirs = DIRECTIONS.life.map(d => `- 【${d.categoryName}】${d.desc}`).join('\n');

  let focusDesc = '';
  if (slot.ratio.work === 1 && slot.ratio.life === 0) {
    focusDesc = `本次全部生成【工作向】内容，从以下方向中选择：\n${workDirs}`;
  } else if (slot.ratio.work === 0 && slot.ratio.life === 1) {
    focusDesc = `本次全部生成【生活向】内容，从以下方向中选择：\n${lifeDirs}`;
  } else {
    focusDesc = `本次工作向和生活向各占约50%，从以下方向中选择：\n工作向：\n${workDirs}\n生活向：\n${lifeDirs}`;
  }

  const dateStr = `${slot.shanghai.getUTCFullYear()}-${String(slot.shanghai.getUTCMonth()+1).padStart(2,'0')}-${String(slot.shanghai.getUTCDate()).padStart(2,'0')}`;

  return `你是一个"梗库"内容生成助手。你的任务是为用户生成有趣、实用的话题梗，用于日常社交聊天。

## 用户画像
- 工作：React Native 开发、App 开发、前端程序员，深度使用 AI 工具（Cursor/TRAE/Copilot/ChatGPT/Claude），日常重度依赖 AI 编程和 AI 工具
- 生活：丈夫、7岁女孩的爸爸、丈母娘喜欢聊时事/生活/儿童教育/乒乓球

## 本次生成时段
${slot.title}（${slot.desc}）
日期：${dateStr}

## 内容方向
${focusDesc}

## 生成要求
1. 生成 8 条梗，每条包含：title（标题）、category（分类key）、categoryName（分类名）、content（梗的描述，生动有趣）、explanation（梗的解释/背景，帮用户理解）、usageTip（怎么用这个梗，具体到可以怎么开口聊）
2. 梗要有趣、接地气，能引发共鸣和笑声
3. **重点往 AI 使用方面找料**——用户深度使用 AI，AI 编程、AI 工具、Prompt 工程、AI 文化（token 烧钱、AI 幻觉、AI 焦虑等）方面的梗要多生成，这是用户最感兴趣的方向
4. 内容要有时效性，结合 2026 年近期热点（如果有的话）
5. 解读要清晰，让不完全了解背景的人也能听懂
6. usageTip 要具体，给出可以直接用的开场白或聊天切入方式
7. category 必须是以下之一：rn, frontend, app-dev, ai-coding, ai-tools, prompt, ai-culture, devtools, ai-life, edu, pingpong, current, family, life
8. 不要生成已有的重复内容，尽量有新意

## 输出格式
请直接输出 JSON 数组，不要包含 markdown 代码块标记，不要有其他文字：
[{"title":"...","category":"...","categoryName":"...","content":"...","explanation":"...","usageTip":"..."}, ...]`;
}

// ===== 调用 OpenRouter =====
async function generateContent(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/zyestin/gengku',
      'X-Title': 'Gengku',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: '你是一个专业的内容创作者，擅长用幽默风趣的方式解读技术和生活话题。你输出的是纯JSON，不包含任何markdown标记。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenRouter API 错误 ${response.status}: ${errText}`);
  }

  const data = await response.json();
  let text = data.choices[0].message.content.trim();

  // 清理可能的 markdown 代码块标记
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');

  return JSON.parse(text);
}

// ===== 主流程 =====
async function main() {
  const slot = getCurrentSlot();
  console.log(`📅 时段: ${slot.title} (${slot.slotId})`);
  console.log(`🤖 模型: ${MODEL}`);

  // 读取现有数据
  let existing = { lastUpdated: '', content: [] };
  if (existsSync(DATA_PATH)) {
    existing = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  }

  // 生成新内容
  const prompt = buildPrompt(slot);
  console.log('⏳ 正在生成内容...');
  const newItems = await generateContent(prompt);
  console.log(`✅ 生成了 ${newItems.length} 条新梗`);

  // 去重（标题去重）
  const existingTitles = new Set(existing.content.map(c => c.title));
  const uniqueItems = newItems.filter(item => !existingTitles.has(item.title));

  // 添加元数据
  const now = new Date();
  const shanghaiNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = `${shanghaiNow.getUTCFullYear()}-${String(shanghaiNow.getUTCMonth()+1).padStart(2,'0')}-${String(shanghaiNow.getUTCDate()).padStart(2,'0')}`;
  const timeStr = `${dateStr}T${String(shanghaiNow.getUTCHours()).padStart(2,'0')}:${String(shanghaiNow.getUTCMinutes()).padStart(2,'0')}:00+08:00`;

  const enriched = uniqueItems.map((item, i) => ({
    id: `${Date.now()}-${i}`,
    ...item,
    slot: slot.slotId,
    date: dateStr,
    createdAt: timeStr,
  }));

  // 合并 & 保留最近 200 条
  const merged = [...enriched, ...existing.content].slice(0, 200);
  const updated = {
    lastUpdated: timeStr,
    version: existing.version || '1.0.0',
    content: merged,
  };

  writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log(`📝 content.json 已更新，共 ${merged.length} 条（新增 ${enriched.length} 条）`);
}

main().catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
