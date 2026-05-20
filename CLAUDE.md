# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

河南省生态环境厅环境监测工勤技能考试系统 - 一个用于环境监测从业资格考试的在线刷题和模拟考试平台。

## 项目结构

```
exam-system/
├── src/
│   └── server.js          # Express后端服务器 (ES Module)
├── public/
│   └── index.html         # 单页应用前端 (HTML/CSS/JS)
├── data/
│   ├── questions.json      # 题库数据 (2850道题)
│   └── history.json        # 历史记录数据
└── package.json

根目录:
├── 考试系统快捷方式.html   # 快捷方式入口
└── 题库文件/              # Word文档格式的原始题库
```

## 启动命令

```bash
cd exam-system
npm start        # 启动服务器 (http://localhost:3000)
npm run import   # 导入题库 (从Word文档解析)
```

## 技术栈

- **前端**: 原生HTML/CSS/JavaScript (单页应用)
- **后端**: Express.js (ES Module)
- **数据存储**: JSON文件 (questions.json, history.json)
- **端口**: 默认3000，可通过环境变量PORT修改

## 题库规格

- 总题数: 2850道
- 判断题: 1868道 (35%)
- 选择题: 982道 (65%)
- 分类: 水和废水、环境空气、其他类

## 考试配置

- 模拟考试默认50题或100题
- 35%判断题 + 65%选择题
- 时间限制: 50题30分钟，100题60分钟
- 及格分数: 60分

## 前端状态管理

关键全局变量:
- `currentQuestions[]` - 当前题目列表
- `currentIndex` - 当前题目索引
- `userAnswers{}` - 用户答案映射
- `answeredQuestions Set` - 已确定答案的题号
- `isExamMode` - 是否考试模式
- `sessionWrongIds[]` - 本次错题ID列表

## 后端API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api | 系统信息 |
| GET | /api/questions | 题目列表(分页) |
| GET | /api/questions/random | 随机获取题目 |
| GET | /api/questions/:id | 单条题目(含答案) |
| POST | /api/exam/generate | 生成试卷 |
| POST | /api/exam/grading | 提交评分 |
| GET | /api/statistics | 统计数据 |
| GET | /api/history | 历史记录 |
| POST | /api/history/clear | 清除历史 |
| POST | /api/cache/clear-all | 清除所有缓存 |

## 多用户支持

系统设计为支持多用户，每个用户的数据通过userName字段区分。历史记录中包含userName字段用于标识不同用户。

## 注意事项

1. 前端代码位于 `exam-system/public/index.html` - 部署时会被Express直接服务
2. 题目答案仅在练习模式返回，考试模式不返回答案
3. 最近使用的题目ID存储在服务器内存中(最多200条)，用于减少重复出题
4. 历史记录最多保存200条

## 小程序部署说明

当前系统设计为独立服务器运行。如需部署到微信小程序:
1. 需要将后端API适配为小程序云开发或自建服务器
2. 前端代码可直接在小程序 web-view 中运行
3. 需要配置API_BASE为实际的后端地址