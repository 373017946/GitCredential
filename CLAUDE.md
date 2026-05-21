# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 项目概述

**项目名称：** 河南省生态环境厅环境监测工勤技能考试系统

**项目定位：** 商用级在线刷题与模拟考试平台，面向环境监测从业资格考生。

**当前阶段：** 阶段一 - 电脑端网页全面改造（进行中）
- 阶段一：电脑端网页全面改造（当前）
- 阶段二：微信小程序改造（待阶段一验收后启动）

**核心目标：**
1. 前端UI全面升级 — 科技感深蓝/绿色调，专业政务风格
2. 后端代码优化 — 提升稳定性与可维护性
3. 系统稳定性强化 — 错误处理、缓存优化、数据安全

---

## 项目结构

```
exam-system/
├── src/
│   └── server.js          # Express后端服务器 (ES Module)
├── public/
│   └── index.html         # 单页应用前端 (HTML/CSS/JS)
├── data/
│   ├── questions.json     # 题库数据 (2850道题)
│   ├── history.json        # 历史记录数据
│   └── users.json          # 用户数据
├── package.json
└── node_modules/

根目录:
├── 考试系统快捷方式.html    # 快捷方式入口
├── docs/                   # 项目文档
│   └── requirements/       # 需求文档
└── 题库文件/               # Word文档格式的原始题库
```

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 原生HTML/CSS/JavaScript | 单页应用，未使用框架 |
| 后端 | Express.js (ES Module) | 轻量级Node.js框架 |
| 数据存储 | JSON文件 | questions.json / history.json / users.json |
| 端口 | 3000 | 可通过环境变量PORT修改 |

---

## UI设计规范（阶段一）

### 视觉风格
- **主色调：** 科技感深蓝/绿色调
- **风格定位：** 专业严肃，适合政务/教育系统
- **字体：** 系统默认字体栈（-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif）

### 色彩系统
```
主色（Primary）：#1b5e20 ~ #2e7d32 ~ #43a047（绿色渐变）
辅助色（Secondary）：#1565c0（蓝色）
背景色：#f0f2f5（浅灰）
卡片背景：#ffffff（白色）
强调色：#f44336（错误/警示红）
成功色：#4caf50（正确绿）
边框色：#e0e0e0
文字色：#333（主文字）、#666（次要文字）
```

### 页面列表
1. **首页** — 统计概览、功能入口
2. **刷题配置页** — 类型/分类/题数选择
3. **考试配置页** — 题数/时长选择
4. **答题页** — 题目展示、选项、答题卡、计时器
5. **结果页** — 得分、展示、错题提示
6. **成绩统计页** — 历史记录、统计数据
7. **答案解析页** — 逐题查看正确答案
8. **错题本页** — 收录的错题列表与练习

---

## 启动命令

```bash
# 进入项目目录
cd exam-system

# 安装依赖
npm install

# 启动服务器（开发）
npm start        # http://localhost:3000

# 生产环境
NODE_ENV=production npm start
```

---

## 题库规格

- **总题数：** 2850道
- **判断题：** 1868道（35%）
- **选择题：** 982道（65%）
- **分类：** 水和废水、环境空气、其他类

---

## 考试配置

| 配置项 | 默认值 |
|--------|--------|
| 模拟考试题数 | 50题 / 100题 |
| 判断题比例 | 35% |
| 选择题比例 | 65% |
| 及格分数 | 60分 |
| 50题时限 | 30分钟 |
| 100题时限 | 60分钟 |

---

## 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api` | 系统信息 |
| GET | `/api/questions` | 题目列表（分页） |
| GET | `/api/questions/random` | 随机获取题目 |
| GET | `/api/questions/:id` | 单条题目（含答案） |
| POST | `/api/exam/generate` | 生成试卷 |
| POST | `/api/exam/grading` | 提交评分 |
| GET | `/api/statistics` | 统计数据 |
| GET | `/api/history` | 历史记录 |
| DELETE | `/api/history/:id` | 删除历史记录 |
| POST | `/api/history/clear` | 清除历史 |
| POST | `/api/cache/clear-all` | 清除所有缓存 |
| POST | `/api/user/login` | 用户登录 |
| GET | `/api/user/:userId` | 用户信息 |
| GET | `/api/user/:userId/history` | 用户历史 |
| GET | `/api/user/:userId/statistics` | 用户统计 |
| GET | `/api/wrong-questions` | 错题列表 |

---

## 前端状态管理

关键全局变量：

| 变量 | 类型 | 说明 |
|------|------|------|
| `currentQuestions` | Array | 当前题目列表 |
| `currentIndex` | Number | 当前题目索引 |
| `userAnswers` | Object | 用户答案映射 |
| `answeredQuestions` | Set | 已确定答案的题号集合 |
| `isExamMode` | Boolean | 是否考试模式 |
| `sessionWrongIds` | Array | 本次练习的错题ID列表 |
| `currentResults` | Array | 当前答题结果 |
| `examStartTime` | Number | 考试开始时间戳 |

---

## 多用户支持

- 系统通过 localStorage 生成匿名用户ID（user_时间戳_随机字符串）
- 用户可自定义昵称，数据通过 userId 字段区分
- 历史记录关联用户ID，支持多用户数据隔离

---

## 注意事项

1. 前端代码位于 `exam-system/public/index.html`
2. 题目答案仅在练习模式返回，考试模式不返回答案
3. 最近使用的题目ID存储在服务器内存中（最多200条）
4. 历史记录最多保存200条
5. API基础地址：`http://localhost:3000/api`

---

## 阶段一验收标准

### 前端验收
- [ ] 首页、刷题、考试、成绩、错题本等页面风格统一
- [ ] 科技感深蓝/绿色调视觉风格完整呈现
- [ ] 响应式布局适配电脑端和手机端
- [ ] 交互流畅，无明显卡顿
- [ ] 答题、提交、结果显示逻辑正确

### 后端验收
- [ ] 服务器启动正常，无报错
- [ ] API响应正常，数据准确
- [ ] 错误处理完善，异常情况有友好提示
- [ ] 缓存机制正常工作

### 部署验收
- [ ] 电脑端浏览器测试通过
- [ ] 无控制台错误

---

## 后续阶段（待定）

### 阶段二：微信小程序改造
- 根据阶段一验收结果再决定具体范围
- 潜在优化方向：界面适配、功能调整等

---

*文档更新时间：2026-05-21*