import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODE = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'gengku';
const DATA_PATH = MODE === 'parenting'
  ? join(__dirname, '..', 'data', 'parenting.json')
  : join(__dirname, '..', 'data', 'content.json');
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

// ===== 高质量信息源 =====
const SOURCES = {
  x: {
    label: 'X (Twitter) 高赞帖',
    desc: '以下牛人发的帖经常高赞高评论，评论区是梗的宝库。关注他们近期的高互动帖子和评论区金句',
    byCategory: {
      'ai-coding': [
        '@karpathy (Andrej Karpathy) — LLM训练、vibe coding概念创始人，帖子的idea密度极高',
        '@bcherny (Boris Cherny) — Claude Code开发负责人，第一时间分享新工作流和实现细节',
        '@amanrsanger (Aman Sanger) — Cursor内部路由机制、开发者遥测数据',
        '@simonw (Simon Willison) — AI工具实测、提示注入安全、CLI工具、本地模型，帖子附代码和日志',
        '@lilianweng (Lilian Weng) — ex-OpenAI安全负责人，深度技术博客（transformers/RLHF/agents），教科书级',
        '@rasbt (Sebastian Raschka) — ML教科书作者，架构拆解和LLM实现教程，大量实操内容',
        '@ggerganov (Georgi Gerganov) — llama.cpp创造者，让LLM跑在消费级硬件上，本地AI运动',
      ],
      'ai-tools': [
        '@sama (Sam Altman) — OpenAI CEO，产品方向暗示，一条推文引发全网解读',
        '@alexalbert__ (Alex Albert) — Anthropic API技巧、prompt caching、token路由',
        '@emollick (Ethan Mollick) — 沃顿教授，基于数据的AI实验分析，高信噪比',
        '@levelsio (Levels.io) — 独立开发者，AI产品实测和模型对比，接地气',
        '@AndrewYNg (吴恩达) — AI教育、Agent实践、产业落地建议，发帖接地气',
        '@rauchg (Guillermo Rauch) — Vercel CEO，AI开发工具、AI辅助Web开发，v0/AI SDK',
        '@AravindSriniv (Aravind Srinivas) — Perplexity AI CEO，AI搜索、RAG、Agent产品',
        '@logankilpatrick (Logan Kilpatrick) — Google AI/Gemini产品负责人，横跨OpenAI和Google两大实验室',
      ],
      'prompt': [
        '@mattshumer_ (Matt Shumer) — Prompt工程实验、模型工作流优化、速度测试',
        '@AmandaAskell__ (Amanda Askell) — RLHF、Claude角色调优内幕',
        '@rilegoodside (Riley Goodside) — Prompt工程先驱，早期大模型能力测试，高互动',
      ],
      'ai-culture': [
        '@ylecun (Yann LeCun) — Meta首席AI科学家，LLM局限性质疑、开源模型倡导，每日输出观点',
        '@_akhaliq (AK) — 每日AI论文和产品发布速递，第一时间',
        '@ClementDelangue (Hugging Face CEO) — 开源AI生态、模型采用数据',
        '@swyx (swyx) — AI工程生态系统、开发者趋势分析',
        '@elonmusk (马斯克) — xAI/Grok，AI方向极强观点输出，评论区永远在吵',
        '@drfeifei (李飞飞) — ImageNet创始人、World Labs空间智能，AI研究+伦理视角',
        '@fchollet (François Chollet) — Keras创造者、ARC-AGI基准，真正智能vs模式匹配的批判',
        '@garymarcus (Gary Marcus) — AI怀疑论者，实质性批评而非纯黑，经常引发论战',
        '@geehotz (George Hotz) — tinygrad/comma.ai创始人，原始工程视角，反主流AI观点',
      ],
      'rn': [
        '@satya164 (Satyajit Sahoo) — React Navigation核心维护者',
        '@dabit3 (Nader Dabit) — RN/AWS/Serverless专家',
        '@callstackio (Callstack) — RN核心贡献者团队，Repack/RNEF创建者',
      ],
      'frontend': [
        '@dan_abramov (Dan Abramov) — React核心团队，删帖和长文引发讨论',
        '@acdlite (Andrew Clark) — React核心团队',
        '@cassidoo (Cassidy Williams) — 前端技术、开发者教育',
      ],
      'devtools': [
        '@ID_AA_Carmack (John Carmack) — 系统级思考、性能权衡，VR/AI讨论',
      ],
    },
  },
  reddit: {
    label: 'Reddit 高赞帖+评论区',
    desc: '以下社区天天有大量更新，高赞帖和评论区讨论丰富。关注热门帖下的高赞评论——那些才是真正的梗',
    byCategory: {
      'ai-coding': [
        'r/ChatGPTCoding — 多工具AI编程讨论（Claude Code/Cursor/Codex对比），真实使用体验',
        'r/ClaudeAI — Claude Code工作流、上下文管理、终端agent配置',
        'r/vibecoding — AI辅助开发实战、项目展示（89K成员），ship-focused',
        'r/CodingWithAI — 编码AI资源汇总',
      ],
      'ai-tools': [
        'r/ChatGPT — ChatGPT使用经验、创意prompt、翻车案例',
        'r/OpenAI — OpenAI开发/API实现讨论',
      ],
      'prompt': [
        'r/AIPromptProgramming — Prompt工程社区（69K成员），系统性prompt设计',
      ],
      'ai-culture': [
        'r/LocalLLaMA — 本地LLM部署、开源模型社区，技术讨论深',
        'r/singularity — AGI讨论、AI未来辩论，乐观派vs悲观派梗',
        'r/AI_Agents — Agent框架、自主工具，生产力工具分享',
        'r/StableDiffusion — 图像生成、模型对比、AI艺术梗',
      ],
      'rn': [
        'r/reactnative — React Native开发者社区，踩坑和解决方案',
      ],
      'frontend': [
        'r/reactjs — React社区（~470K），组件/状态管理/hooks讨论',
        'r/webdev — Web开发综合社区',
        'r/Frontend — 前端开发讨论',
      ],
      'devtools': [
        'r/ExperiencedDevs — 资深开发者讨论，高信噪比',
        'r/programming — 通用编程社区（5M+），热点技术新闻',
        'r/git — Git技巧与翻车',
      ],
    },
  },
  hackernews: {
    label: 'Hacker News',
    url: 'https://news.ycombinator.com/',
    desc: 'YC旗下技术新闻社区，每日高质量技术讨论。评论区是程序员的吐槽大会，金句频出',
  },
  chinese: {
    label: '中文高质量信息源',
    desc: '中文技术/AI社区每日更新，热文评论区同样有大量高质量讨论和梗',
    sources: [
      'InfoQ (infoq.cn) — 中文技术媒体，架构、编程趋势、技术大会内容，深度文章',
      '量子位 (qbitai.com) — 中文AI媒体，每日AI新闻速递和深度解读，覆盖国内外',
      '机器之心 (jiqizhixin.com) — 中文AI媒体，论文解读、产业报告、技术教程',
      'V2EX (v2ex.com) — 中文开发者社区，类似Hacker News，技术讨论+生活吐槽',
      '36氪 (36kr.com) — 科技创投媒体，AI创业、融资、产品发布',
      '掘金 (juejin.cn) — 中文开发者社区，前端/RN/AI技术文章，有热榜',
    ],
  },
  podcasts: {
    label: 'AI 深度访谈播客',
    desc: '以下播客深度采访AI大佬（Dario Amodei、Karpathy、Hassabis等），嘉宾金句和观点碰撞是高质量梗的来源',
    shows: [
      'Dwarkesh Podcast (@dwarkesh_sp) — 3-5小时长篇深度访谈，Dario Amodei/Zuckerberg/Hassabis级别嘉宾，问题密度极高',
      'Latent Space (@latentspacepod, swyx+Alessio) — AI工程类播客标杆，agents/inference/evals/production系统',
      'Lex Fridman Podcast (@lexfridman) — 最高覆盖面的AI播客，Altman/Musk/Hassabis/Karpathy多次做客',
      'The Cognitive Revolution (Nathan Labenz) — 模型评测深度，builder视角与研究者逐行讨论架构选择',
      'No Priors (@nopriorspod, Sarah Guo+Elad Gil) — AI创业和公司建设，创始人和投资人访谈',
      'Practical AI (Daniel Whitenack+Chris Benson) — 落地AI功能，MLOps/评测/实现细节',
      'Last Week in AI (Andrey Kurenkov) — 每周AI新闻 roundup，最高效的追赶方式',
      'Machine Learning Street Talk (Tim Scarfe) — 最深技术访谈，架构和理论',
    ],
  },
};

function buildSourcesText(categories) {
  const lines = [];
  for (const cat of categories) {
    const xList = SOURCES.x.byCategory[cat];
    const rList = SOURCES.reddit.byCategory[cat];
    if (xList) lines.push(`  X: ${xList.join(' | ')}`);
    if (rList) lines.push(`  Reddit: ${rList.join(' | ')}`);
  }
  if (lines.length === 0) return '';
  return `\n### 信息源参考\n${SOURCES.x.desc}\n${SOURCES.reddit.desc}\n${SOURCES.hackernews.desc} (${SOURCES.hackernews.url})\n${SOURCES.chinese.desc}:\n  ${SOURCES.chinese.sources.join('\n  ')}\n${SOURCES.podcasts.desc}:\n  ${SOURCES.podcasts.shows.join('\n  ')}\n${lines.join('\n')}`;
}

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
    'workday-evening':   { title: '工作日晚间',   ratio: { work: 0, life: 1 }, desc: '下班了，切换到生活模式，和家人聊' },
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
  let focusCategories = [];
  if (slot.ratio.work === 1 && slot.ratio.life === 0) {
    focusDesc = `本次全部生成【工作向】内容，从以下方向中选择：\n${workDirs}`;
    focusCategories = DIRECTIONS.work.map(d => d.category);
  } else if (slot.ratio.work === 0 && slot.ratio.life === 1) {
    focusDesc = `本次全部生成【生活向】内容，从以下方向中选择：\n${lifeDirs}`;
    focusCategories = [];
  } else {
    focusDesc = `本次工作向和生活向各占约50%，从以下方向中选择：\n工作向：\n${workDirs}\n生活向：\n${lifeDirs}`;
    focusCategories = DIRECTIONS.work.map(d => d.category);
  }

  const sourcesText = buildSourcesText(focusCategories);

  const dateStr = `${slot.shanghai.getUTCFullYear()}-${String(slot.shanghai.getUTCMonth()+1).padStart(2,'0')}-${String(slot.shanghai.getUTCDate()).padStart(2,'0')}`;

  const isMonday = slot.shanghai.getUTCDay() === 1;
  const mondayNote = (isMonday && slot.slotId === 'workday-morning')
    ? `\n## 特别提示\n今天是周一！用户从周五晚上到现在没有看过工作相关内容。请额外关注周五晚上到今天早上期间发生的科技/AI/编程领域的新梗和热点，帮用户快速追上周末错过的工作话题（至少包含 2-3 条周末期间发生的科技/AI 相关梗）。`
    : '';

  return `你是一个"梗库"内容生成助手。你的任务是为用户生成有趣、实用的话题梗，用于日常社交聊天。

## 用户画像
- 工作：React Native 开发、App 开发、前端程序员，深度使用 AI 工具（Cursor/TRAE/Copilot/ChatGPT/Claude），日常重度依赖 AI 编程和 AI 工具
- 生活：丈夫、7岁女孩的爸爸、丈母娘喜欢聊时事/生活/儿童教育/乒乓球

## 本次生成时段
${slot.title}（${slot.desc}）
日期：${dateStr}
${mondayNote}
## 内容方向
${focusDesc}
${sourcesText}
## 生成要求
1. 生成 8 条梗，每条包含：title（标题）、category（分类key）、categoryName（分类名）、content（梗的描述，生动有趣）、explanation（梗的解释/背景，帮用户理解）、usageTip（怎么用这个梗，具体到可以怎么开口聊）、sourceUrl（可选，原始链接）
2. 梗要有趣、接地气，能引发共鸣和笑声
3. **重点往 AI 使用方面找料**——用户深度使用 AI，AI 编程、AI 工具、Prompt 工程、AI 文化（token 烧钱、AI 幻觉、AI 焦虑等）方面的梗要多生成，这是用户最感兴趣的方向
4. 内容要有时效性，结合 2026 年近期热点（如果有的话）
5. 解读要清晰，让不完全了解背景的人也能听懂
6. usageTip 要具体，给出可以直接用的开场白或聊天切入方式
7. category 必须是以下之一：rn, frontend, app-dev, ai-coding, ai-tools, prompt, ai-culture, devtools, ai-life, edu, pingpong, current, family, life
8. 不要生成已有的重复内容，尽量有新意
9. **信息源导向**：优先从上面列出的 X 牛人高赞帖、Reddit 热帖评论区、Hacker News 讨论中"找料"——这些地方天天有大量更新，评论区更是梗的宝库。想象你刚刚刷完这些信息源，把最有趣、最有话题性的内容提炼成梗
10. sourceUrl：如果梗来源于具体的帖子/文章/新闻，提供真实的原始链接（如 x.com/xxx/status/xxx、reddit.com/r/xxx/comments/xxx、news.ycombinator.com/item?id=xxx）。如果是一般性经验/段子，sourceUrl 留空。不要编造不存在的 URL！

## 输出格式
请直接输出 JSON 数组，不要包含 markdown 代码块标记，不要有其他文字：
[{"title":"...","category":"...","categoryName":"...","content":"...","explanation":"...","usageTip":"...","sourceUrl":"..."}, ...]`;
}

// ===== 育儿模式配置 =====
const PT_THEMES = {
  'unique-path':       { name: '做唯一故事', desc: '找到自己独特路径的人——不随大流、不卷竞争，做无可替代的自己' },
  'learning-meaning':  { name: '学习的意义', desc: '为什么学？不是因为考试，是因为好奇心和探索欲' },
  'benefiting-others': { name: '惠及他人', desc: '用热爱服务世界——画画感动别人、昆虫知识分享给同学、游戏让大家快乐' },
  'science-fun':       { name: '科学乐趣', desc: '牛顿煮手表、爱因斯坦拒当总统——科学家不是因为有用才做科学，是因为太好玩了' },
  'open-minded':       { name: '豁达人生', desc: '苏轼被贬海南还发明美食、王阳明被贬龙场反而悟道——困难不可怕，失去好奇心才可怕' },
  'math-beauty':       { name: '数学之美', desc: '向日葵种子螺旋、斐波那契数列、蜂巢六边形——数学是大自然的密码，不是作业' },
};

const PT_INTERESTS = {
  'drawing':   { name: '画画', desc: '做唯一画风、办画展、用画画帮别人看见看不见的东西' },
  'insects':   { name: '昆虫', desc: '观察记录、录制昆虫小课堂分享给同学、博物插画连接画画' },
  'voiceover': { name: '配音', desc: '一人配多角、英语通过配音自然学、声音技巧练习' },
  'musical':   { name: '音乐剧', desc: '家庭剧场当小导演、Lin-Manuel Miranda式创新、连接配音+英语' },
  'games':     { name: '游戏组织', desc: '分析游戏设计、创造新游戏、写规则手册、教领导力原则' },
  'general':   { name: '通用', desc: '跨兴趣的通用教育主题' },
};

const PT_ROTATION = [
  'benefiting-others',  // Sunday
  'science-fun',         // Monday
  'drawing',            // Tuesday (interest-based)
  'open-minded',         // Wednesday
  'voiceover',          // Thursday (interest-based)
  'unique-path',        // Friday
  'math-beauty',        // Saturday
];

function getParentingSlot() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 3600 * 1000);
  const day = shanghai.getUTCDay();
  const dateStr = `${shanghai.getUTCFullYear()}-${String(shanghai.getUTCMonth()+1).padStart(2,'0')}-${String(shanghai.getUTCDate()).padStart(2,'0')}`;
  const rotKey = PT_ROTATION[day];

  let theme = null, interest = null;
  if (PT_THEMES[rotKey]) {
    theme = { key: rotKey, ...PT_THEMES[rotKey] };
  } else if (PT_INTERESTS[rotKey]) {
    interest = { key: rotKey, ...PT_INTERESTS[rotKey] };
  }

  return {
    slotId: 'parenting-daily',
    title: '育儿每日故事',
    desc: '爸爸讲给7岁女儿团团听的故事',
    theme,
    interest,
    shanghai,
    dateStr,
  };
}

function buildParentingPrompt(slot) {
  const themesDesc = Object.entries(PT_THEMES).map(([k,v]) => `- ${v.name}（${k}）: ${v.desc}`).join('\n');
  const interestsDesc = Object.entries(PT_INTERESTS).map(([k,v]) => `- ${v.name}（${k}）: ${v.desc}`).join('\n');

  let focusHint = '';
  if (slot.theme) {
    focusHint = `今日主题方向：${slot.theme.name}（${slot.theme.key}）——${slot.theme.desc}。请围绕这个主题选择真实人物和事件。`;
  } else if (slot.interest) {
    focusHint = `今日兴趣方向：${slot.interest.name}（${slot.interest.key}）——${slot.interest.desc}。请围绕这个兴趣选择真实人物和事件。`;
  }

  const dateStr = slot.dateStr;

  return `你是一个育儿故事内容生成助手。你的任务是为一位父亲生成可以讲给7岁女儿（团团，二年级）听的故事。

## 核心教育理念
"做唯一，不卷第一"——不让孩子在别人设定的赛道上争第一，而是帮她找到属于自己的赛道，做到无可替代。

## 孩子的兴趣（5个方向）
${interestsDesc}

## 教育主题（6个方向）
${themesDesc}

## 今日内容
日期：${dateStr}
${focusHint || '今日自由生成，请从上述主题和兴趣中选择有趣的组合，但必须基于真实人物和事件。'}

## ⚠️ 最重要规则：必须真实
1. **每条故事必须基于真实人物、真实事件、真实历史**。可以是科学家、艺术家、运动员、历史人物、当代人物的真实经历。
2. **严禁编造虚构故事**。不能是"有个小女孩..."这种自己编的寓言。必须是查得到、对得上号的人和事。
3. **故事内容可以润色**：为了7岁孩子能懂、觉得有趣，你可以简化、加画面感、调整语言风格，但核心事实（人物、事件、因果关系）必须真实。
4. **sourceUrl 必填**：每条故事必须提供至少一个真实可访问的源链接。优先使用：
   - 维基百科：https://zh.wikipedia.org/wiki/xxx 或 https://en.wikipedia.org/wiki/xxx
   - BBC/CNN/National Geographic 等权威媒体报道
   - 人物官方网站、博物馆页面
   - TED Talks、纪录片页面
   - 不要编造不存在的URL！如果不确定具体URL，提供维基百科搜索链接

## 真实人物参考（可拓展，不限于此）
- Frida Kahlo（画家，受伤后对着镜子画自己）
- Maria Sibylla Merian（博物插画师，画昆虫变态）
- Leonardo da Vinci（画画+科学+工程）
- Albert Einstein（好奇心、想象力）
- Isaac Newton（苹果、光的实验）
- Marie Curie（两次诺贝尔奖）
- Charles Darwin（环球旅行观察自然）
- Jane Goodall（观察黑猩猩）
- Helen Keller（失聪失明后学会沟通）
- Temple Grandin（自闭症，用图像思考改变畜牧业）
- Stephen Hawking（身体受限但思想自由）
- 王阳明、苏轼（中国历史人物）
- Lin-Manuel Miranda（音乐剧创新）
- Miyazaki Hayao（宫崎骏，动画+自然）
- 友好提示：优先选择与孩子兴趣（画画/昆虫/配音/音乐剧/游戏）相关的真实人物

## 生成要求
生成 3 条故事，每条包含：
- title: 标题，简洁有趣，能引起7岁孩子好奇
- theme: 主题key（从上述6个中选）
- themeName: 主题名
- interest: 兴趣key（从上述6个中选，通用用general）
- interestName: 兴趣名
- story: 真实故事，3-5句话，7岁能懂，有画面感，生动有趣
- dadScript: 爸爸的开场白，以"团团，你知道吗？"开头，口语化，可以直接照着说
- discussionPrompts: 2个开放式问题数组，讲完故事后可以问孩子
- activity: 一个简单的后续活动建议（画画/观察/游戏等），可以当天做
- sourceUrl: **必填**，真实可访问的源链接（维基百科/媒体报道/官方网站等）
- personName: 真实人物姓名（如果是关于特定人物的故事）

## 输出格式
输出 JSON 数组，3个对象。不要输出其他内容。
[{"title":"...","theme":"...","themeName":"...","interest":"...","interestName":"...","story":"...","dadScript":"...","discussionPrompts":["...","..."],"activity":"...","sourceUrl":"https://...","personName":"..."}]`;
}

// ===== 获取免费模型 =====
async function getFreeModels() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const data = await res.json();
    const models = data.data || [];

    const freeTextModels = models.filter(m => {
      const pricing = m.pricing || {};
      const isFree = pricing.prompt === '0' && pricing.completion === '0';
      const modalities = (m.architecture && m.architecture.input_modalities) || [];
      const isText = modalities.includes('text') || modalities.length === 0;
      const id = (m.id || '').toLowerCase();
      const isExcluded = ['lyria', 'clip', 'audio', 'image', 'whisper', 'vision', 'stable'].some(x => id.includes(x));
      return isFree && isText && !isExcluded && m.id !== 'openrouter/free';
    });

    freeTextModels.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
    const top3 = freeTextModels.slice(0, 3).map(m => m.id);
    console.log(`🆓 可用免费模型(top3): ${top3.join(', ') || '无'}`);
    return top3;
  } catch (e) {
    console.log(`⚠️ 获取免费模型列表失败: ${e.message}`);
    return [];
  }
}

// ===== 调用 OpenRouter =====
async function generateContent(prompt, model) {
  const useModel = model || MODEL;
  console.log(`🔄 尝试模型: ${useModel}`);
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/zyestin/gengku',
      'X-Title': 'Gengku',
    },
    body: JSON.stringify({
      model: useModel,
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

  const items = JSON.parse(text);
  const usage = data.usage || {};
  console.log(`✅ 模型 ${useModel} 成功`);
  return { items, usage, usedModel: useModel };
}

// ===== 费用计算 =====
function calculateCost(model, promptTokens, completionTokens) {
  if (model.includes(':free')) return { cost: 0, note: '免费模型' };

  const pricing = {
    'deepseek/deepseek-chat':              { input: 0.14,  output: 0.28 },
    'deepseek/deepseek-r1':                { input: 0.55,  output: 2.19 },
    'anthropic/claude-3.5-sonnet':         { input: 3.0,   output: 15.0 },
    'anthropic/claude-3.5-haiku':          { input: 0.8,   output: 4.0 },
    'openai/gpt-4o':                       { input: 2.5,   output: 10.0 },
    'openai/gpt-4o-mini':                 { input: 0.15,  output: 0.6 },
    'google/gemini-2.0-flash-001':         { input: 0.1,   output: 0.4 },
    'meta-llama/llama-3.3-70b-instruct':   { input: 0.23,  output: 0.4 },
  };

  const p = pricing[model] || { input: 0.5, output: 1.5 };
  const cost = (promptTokens * p.input + completionTokens * p.output) / 1_000_000;
  return {
    cost: Math.round(cost * 100000) / 100000,
    note: `$${p.input}/1M输入 + $${p.output}/1M输出`,
  };
}

// ===== 主流程 =====
async function main() {
  const slot = MODE === 'parenting' ? getParentingSlot() : getCurrentSlot();
  console.log(`📅 时段: ${slot.title} (${slot.slotId})`);
  console.log(`🤖 模型: ${MODEL}`);
  if (MODE === 'parenting') console.log(`👶 模式: 育儿`);

  // 读取现有数据
  let existing = { lastUpdated: '', content: [] };
  if (existsSync(DATA_PATH)) {
    existing = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  }

  // 生成新内容（先获取免费模型，带 fallback）
  const freeModels = await getFreeModels();
  const modelsToTry = [...freeModels, MODEL];
  const prompt = MODE === 'parenting' ? buildParentingPrompt(slot) : buildPrompt(slot);
  console.log('⏳ 正在生成内容...');

  let newItems, usage, usedModel;
  for (const model of modelsToTry) {
    try {
      const result = await generateContent(prompt, model);
      newItems = result.items;
      usage = result.usage;
      usedModel = result.usedModel;
      break;
    } catch (e) {
      console.log(`❌ 模型 ${model} 失败: ${e.message}`);
    }
  }
  if (!newItems) throw new Error('所有模型尝试均失败');
  console.log(`✅ 生成了 ${newItems.length} 条${MODE === 'parenting' ? '育儿故事' : '新梗'}`);
  console.log(`📊 Token: 输入 ${usage.prompt_tokens || 0} / 输出 ${usage.completion_tokens || 0} / 总计 ${usage.total_tokens || 0}`);

  // 去重（标题去重）
  const existingTitles = new Set(existing.content.map(c => c.title));
  const uniqueItems = newItems.filter(item => !existingTitles.has(item.title));

  // 添加元数据
  const now = new Date();
  const shanghaiNow = new Date(now.getTime() + 8 * 3600 * 1000);
  const dateStr = `${shanghaiNow.getUTCFullYear()}-${String(shanghaiNow.getUTCMonth()+1).padStart(2,'0')}-${String(shanghaiNow.getUTCDate()).padStart(2,'0')}`;
  const timeStr = `${dateStr}T${String(shanghaiNow.getUTCHours()).padStart(2,'0')}:${String(shanghaiNow.getUTCMinutes()).padStart(2,'0')}:00+08:00`;

  const enriched = uniqueItems.map((item, i) => {
    const { sourceUrl, ...rest } = item;
    const cleanUrl = (sourceUrl && sourceUrl.trim().startsWith('http')) ? sourceUrl.trim() : null;
    return {
      id: `${Date.now()}-${i}`,
      ...rest,
      ...(cleanUrl ? { sourceUrl: cleanUrl } : {}),
      date: dateStr,
      timeSlot: MODE === 'parenting' ? 'evening' : slot.slotId,
      slot: slot.slotId,
      createdAt: timeStr,
    };
  });

  // 合并 & 保留最近 200 条
  const merged = [...enriched, ...existing.content].slice(0, 200);

  // 费用统计
  const { cost, note } = calculateCost(usedModel, usage.prompt_tokens || 0, usage.completion_tokens || 0);
  const isFree = usedModel.includes(':free');
  console.log(`💰 费用: ${isFree ? '💚 免费模型，零花费！' : `$${cost} (${note})`}`);

  const updated = {
    lastUpdated: timeStr,
    version: existing.version || '1.0.0',
    content: merged,
    generationStats: {
      model: usedModel,
      lastRun: timeStr,
      slot: slot.title,
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      cost: cost,
      costNote: isFree ? '免费模型' : note,
    },
  };

  writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log(`📝 content.json 已更新，共 ${merged.length} 条（新增 ${enriched.length} 条）`);
}

main().catch(err => {
  console.error('❌ 生成失败:', err.message);
  process.exit(1);
});
