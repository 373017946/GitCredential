import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// 配置常量
// ============================================
const CONFIG = {
  PORT: process.env.PORT || 3000,
  DATA_DIR: join(__dirname, '../data'),
  QUESTIONS_FILE: 'questions.json',
  HISTORY_FILE: 'history.json',
  USERS_FILE: 'users.json',
  MAX_RECENT_IDS: 200,
  MAX_HISTORY_RECORDS: 200
};

// ============================================
// 数据存储
// ============================================
let questions = [];
let history = [];
let users = {};
const recentlyUsedIds = [];

// ============================================
// 工具函数
// ============================================
function getFilePath(filename) {
  return join(CONFIG.DATA_DIR, filename);
}

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function loadJSONFile(filepath, defaultValue = null) {
  try {
    if (existsSync(filepath)) {
      return JSON.parse(readFileSync(filepath, 'utf-8'));
    }
  } catch (error) {
    console.error(`[ERROR] 读取文件失败 ${filepath}:`, error.message);
  }
  return defaultValue;
}

function saveJSONFile(filepath, data) {
  try {
    writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error(`[ERROR] 保存文件失败 ${filepath}:`, error.message);
    return false;
  }
}

function markQuestionUsed(questionIds) {
  questionIds.forEach(id => {
    const idx = recentlyUsedIds.indexOf(id);
    if (idx !== -1) {
      recentlyUsedIds.splice(idx, 1);
    }
    recentlyUsedIds.push(id);
  });
  while (recentlyUsedIds.length > CONFIG.MAX_RECENT_IDS) {
    recentlyUsedIds.shift();
  }
}

// ============================================
// 数据初始化
// ============================================
function initializeData() {
  console.log('[INIT] 开始初始化数据...');

  // 加载题库
  questions = loadJSONFile(getFilePath(CONFIG.QUESTIONS_FILE), []);
  console.log(`[INIT] 题库加载完成，共 ${questions.length} 道题目`);

  // 加载用户数据
  users = loadJSONFile(getFilePath(CONFIG.USERS_FILE), {});
  if (!existsSync(getFilePath(CONFIG.USERS_FILE))) {
    saveJSONFile(getFilePath(CONFIG.USERS_FILE), users);
  }
  console.log(`[INIT] 用户数据加载完成，共 ${Object.keys(users).length} 个用户`);

  // 加载历史记录
  history = loadJSONFile(getFilePath(CONFIG.HISTORY_FILE), []);
  if (!existsSync(getFilePath(CONFIG.HISTORY_FILE))) {
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);
  }
  console.log(`[INIT] 历史记录加载完成，共 ${history.length} 条记录`);
}

// ============================================
// Express 应用设置
// ============================================
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ============================================
// 辅助函数
// ============================================
function filterQuestions(allQuestions, { type, category, subject }) {
  let filtered = [...allQuestions];
  if (type) filtered = filtered.filter(q => q.type === type);
  if (category) filtered = filtered.filter(q => q.category === category);
  if (subject) filtered = filtered.filter(q => q.subject === subject);
  return filtered;
}

// ============================================
// API 路由
// ============================================

// API根目录
app.get('/api', (req, res) => {
  res.json({
    name: '河南省生态环境厅环境监测工勤技能考试系统',
    version: '2.0.0',
    totalQuestions: questions.length,
    statistics: {
      trueFalse: questions.filter(q => q.type === 'true_false').length,
      choice: questions.filter(q => q.type === 'choice').length,
      bySubject: {
        '水和废水': questions.filter(q => q.subject === '水和废水').length,
        '环境空气': questions.filter(q => q.subject === '环境空气').length,
        '其他类': questions.filter(q => q.subject === '其他类').length,
      }
    }
  });
});

// 获取题目列表
app.get('/api/questions', (req, res) => {
  try {
    const { type, category, subject, page = 1, limit = 50 } = req.query;
    let filtered = filterQuestions(questions, { type, category, subject });

    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);

    res.json({
      total: filtered.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: filtered.slice(startIndex, endIndex).map(q => ({
        id: q.id, code: q.code, type: q.type,
        category: q.category, subject: q.subject,
        content: q.content, options: q.options
      }))
    });
  } catch (error) {
    console.error('[ERROR] /api/questions:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取随机题目
app.get('/api/questions/random', (req, res) => {
  try {
    const { count = 10, type, category, subject, includeAnswer } = req.query;
    const requestCount = parseInt(count);

    if (type) {
      let filtered = filterQuestions(questions, { type, category, subject });
      if (filtered.length > requestCount * 2) {
        filtered = filtered.filter(q => !recentlyUsedIds.includes(q.id));
      }

      const shuffled = shuffle(filtered);
      const selected = shuffled.slice(0, requestCount);
      markQuestionUsed(selected.map(q => q.id));

      return res.json(selected.map(q => {
        const base = { id: q.id, code: q.code, type: q.type, category: q.category, subject: q.subject, content: q.content, options: q.options };
        if (includeAnswer === 'true' || includeAnswer === true) return { ...base, answer: q.answer };
        return base;
      }));
    }

    // 35% 判断题，65% 选择题
    let trueFalsePool = filterQuestions(questions, { type: 'true_false', category, subject });
    let choicePool = filterQuestions(questions, { type: 'choice', category, subject });

    if (trueFalsePool.length > requestCount * 2) {
      trueFalsePool = trueFalsePool.filter(q => !recentlyUsedIds.includes(q.id));
    }
    if (choicePool.length > requestCount * 2) {
      choicePool = choicePool.filter(q => !recentlyUsedIds.includes(q.id));
    }

    const trueFalseCount = Math.floor(requestCount * 0.35);
    const choiceCount = requestCount - trueFalseCount;

    const shuffledTF = shuffle(trueFalsePool);
    const shuffledChoice = shuffle(choicePool);

    const selectedTF = shuffledTF.slice(0, Math.min(trueFalseCount, shuffledTF.length));
    const selectedChoice = shuffledChoice.slice(0, Math.min(choiceCount, shuffledChoice.length));

    const selected = [...selectedTF, ...selectedChoice];
    markQuestionUsed(selected.map(q => q.id));

    res.json(selected.map(q => {
      const base = { id: q.id, code: q.code, type: q.type, category: q.category, subject: q.subject, content: q.content, options: q.options };
      if (includeAnswer === 'true' || includeAnswer === true) return { ...base, answer: q.answer };
      return base;
    }));
  } catch (error) {
    console.error('[ERROR] /api/questions/random:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单条题目
app.get('/api/questions/:id', (req, res) => {
  try {
    const question = questions.find(q => q.id === parseInt(req.params.id));
    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }
    res.json(question);
  } catch (error) {
    console.error('[ERROR] /api/questions/:id:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 验证答案
app.post('/api/questions/check', (req, res) => {
  try {
    const { questionId, answer } = req.body;

    if (!questionId || answer === undefined) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const question = questions.find(q => q.id === parseInt(questionId));
    if (!question) {
      return res.status(404).json({ error: '题目不存在' });
    }

    const isCorrect = question.answer.toUpperCase() === answer.toUpperCase();
    res.json({
      questionId,
      yourAnswer: answer,
      correctAnswer: question.answer,
      isCorrect
    });
  } catch (error) {
    console.error('[ERROR] /api/questions/check:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 生成试卷
app.post('/api/exam/generate', (req, res) => {
  try {
    const { questionCount = 50, subjects } = req.body;
    const subjectList = subjects || ['水和废水', '环境空气', '其他类'];

    const trueFalseCount = Math.floor(questionCount * 0.35);
    const choiceCount = questionCount - trueFalseCount;

    let trueFalsePool = questions.filter(q =>
      q.type === 'true_false' && subjectList.includes(q.subject) && !recentlyUsedIds.includes(q.id)
    );
    let choicePool = questions.filter(q =>
      q.type === 'choice' && subjectList.includes(q.subject) && !recentlyUsedIds.includes(q.id)
    );

    if (trueFalsePool.length < trueFalseCount) {
      trueFalsePool = questions.filter(q => q.type === 'true_false' && subjectList.includes(q.subject));
    }
    if (choicePool.length < choiceCount) {
      choicePool = questions.filter(q => q.type === 'choice' && subjectList.includes(q.subject));
    }

    trueFalsePool = shuffle(trueFalsePool);
    choicePool = shuffle(choicePool);

    const selectedTrueFalse = trueFalsePool.slice(0, Math.min(trueFalseCount, trueFalsePool.length));
    const selectedChoice = choicePool.slice(0, Math.min(choiceCount, choicePool.length));

    const selected = [...selectedTrueFalse, ...selectedChoice];
    markQuestionUsed(selected.map(q => q.id));

    res.json({
      id: Date.now(),
      questions: selected.map(q => ({
        id: q.id, code: q.code, type: q.type,
        category: q.category, subject: q.subject,
        content: q.content, options: q.options
      })),
      answerKeys: selected.map(q => q.answer),
      totalCount: selected.length,
      trueFalseCount: selectedTrueFalse.length,
      choiceCount: selectedChoice.length,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[ERROR] /api/exam/generate:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 提交试卷并评分
app.post('/api/exam/grading', (req, res) => {
  try {
    const { examId, answers, questionIds, userName = '用户', userId, duration, isExam } = req.body;

    if (!answers || !questionIds || !Array.isArray(answers) || !Array.isArray(questionIds)) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    let correct = 0;
    let wrong = 0;
    let wrongQuestionIds = [];
    const results = [];

    for (let i = 0; i < questionIds.length; i++) {
      const question = questions.find(q => q.id === questionIds[i]);
      if (question) {
        const userAnswer = answers[i];
        const isCorrect = question.answer.toUpperCase() === userAnswer?.toUpperCase();
        if (isCorrect) {
          correct++;
        } else {
          wrong++;
          wrongQuestionIds.push(question.id);
        }
        results.push({
          questionId: question.id,
          content: question.content,
          yourAnswer: userAnswer || '',
          correctAnswer: question.answer,
          isCorrect,
          type: question.type,
          subject: question.subject,
          options: question.options
        });
      }
    }

    const totalCount = questionIds.length;
    const score = Math.round((correct / totalCount) * 100);
    const passed = score >= 60;

    const record = {
      id: Date.now(),
      examId,
      userId: userId || userName,
      userName,
      score,
      correctCount: correct,
      wrongCount: wrong,
      totalCount,
      duration: duration || 0,
      isExam: isExam || false,
      wrongQuestionIds,
      createdAt: new Date().toISOString()
    };

    history.unshift(record);
    if (history.length > CONFIG.MAX_HISTORY_RECORDS) {
      history = history.slice(0, CONFIG.MAX_HISTORY_RECORDS);
    }
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);

    res.json({
      score,
      correctCount: correct,
      wrongCount: wrong,
      totalCount,
      passed,
      recordId: record.id,
      results
    });
  } catch (error) {
    console.error('[ERROR] /api/exam/grading:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取历史记录
app.get('/api/history', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const startIndex = (parseInt(page) - 1) * parseInt(limit);

    res.json({
      total: history.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: history.slice(startIndex, startIndex + parseInt(limit))
    });
  } catch (error) {
    console.error('[ERROR] /api/history:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单条记录详情
app.get('/api/history/:id', (req, res) => {
  try {
    const record = history.find(r => r.id === parseInt(req.params.id));
    if (!record) {
      return res.status(404).json({ error: '记录不存在' });
    }
    res.json(record);
  } catch (error) {
    console.error('[ERROR] /api/history/:id:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除历史记录
app.delete('/api/history/:id', (req, res) => {
  try {
    const index = history.findIndex(r => r.id === parseInt(req.params.id));
    if (index === -1) {
      return res.status(404).json({ error: '记录不存在' });
    }
    history.splice(index, 1);
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);
    res.json({ message: '删除成功' });
  } catch (error) {
    console.error('[ERROR] /api/history/:id DELETE:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 成绩统计
app.get('/api/statistics', (req, res) => {
  try {
    const totalQuestions = questions.length;
    const byType = {
      trueFalse: questions.filter(q => q.type === 'true_false').length,
      choice: questions.filter(q => q.type === 'choice').length
    };
    const bySubject = {
      '水和废水': questions.filter(q => q.subject === '水和废水').length,
      '环境空气': questions.filter(q => q.subject === '环境空气').length,
      '其他类': questions.filter(q => q.subject === '其他类').length
    };

    const examRecords = history.filter(r => r.isExam);
    const practiceRecords = history.filter(r => !r.isExam);

    let totalWrongCount = 0;
    history.forEach(r => {
      if (r.wrongCount) totalWrongCount += r.wrongCount;
    });

    let avgScore = 0;
    let passedCount = 0;

    if (examRecords.length > 0) {
      const totalScore = examRecords.reduce((sum, r) => sum + r.score, 0);
      avgScore = Math.round(totalScore / examRecords.length);
      passedCount = examRecords.filter(r => r.score >= 60).length;
    }

    res.json({
      totalQuestions,
      byType,
      bySubject,
      historySummary: {
        totalExamRecords: examRecords.length,
        totalPracticeRecords: practiceRecords.length,
        totalWrongCount,
        avgScore,
        passedCount,
        passRate: examRecords.length > 0 ? Math.round((passedCount / examRecords.length) * 100) : 0
      }
    });
  } catch (error) {
    console.error('[ERROR] /api/statistics:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 错题列表
app.get('/api/wrong-questions', (req, res) => {
  try {
    const { limit = 50, userName } = req.query;

    let allWrongIds = [];
    const historyFilter = userName ? history.filter(r => r.userName === userName) : history;
    historyFilter.forEach(record => {
      if (record.wrongQuestionIds && Array.isArray(record.wrongQuestionIds)) {
        allWrongIds = allWrongIds.concat(record.wrongQuestionIds);
      }
    });

    allWrongIds = [...new Set(allWrongIds)];

    const wrongQuestions = allWrongIds.slice(0, parseInt(limit)).map(id => {
      const q = questions.find(q => q.id === id);
      if (q) {
        return {
          id: q.id,
          code: q.code,
          type: q.type,
          category: q.category,
          subject: q.subject,
          content: q.content,
          options: q.options,
          answer: q.answer
        };
      }
      return null;
    }).filter(q => q !== null);

    res.json({
      total: allWrongIds.length,
      data: wrongQuestions
    });
  } catch (error) {
    console.error('[ERROR] /api/wrong-questions:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 用户注册/登录
app.post('/api/user/login', (req, res) => {
  try {
    const { userId, userName, avatar } = req.body;

    if (!userId) {
      return res.status(400).json({ error: '用户ID不能为空' });
    }

    users[userId] = {
      userId,
      userName: userName || '用户',
      avatar: avatar || '',
      lastLogin: new Date().toISOString(),
      createdAt: users[userId]?.createdAt || new Date().toISOString()
    };

    saveJSONFile(getFilePath(CONFIG.USERS_FILE), users);

    res.json({
      success: true,
      user: users[userId]
    });
  } catch (error) {
    console.error('[ERROR] /api/user/login:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取用户信息
app.get('/api/user/:userId', (req, res) => {
  try {
    const user = users[req.params.userId];
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    console.error('[ERROR] /api/user/:userId:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取用户历史记录
app.get('/api/user/:userId/history', (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userHistory = history.filter(r => r.userName === req.params.userId || r.userId === req.params.userId);
    const startIndex = (parseInt(page) - 1) * parseInt(limit);

    res.json({
      total: userHistory.length,
      page: parseInt(page),
      limit: parseInt(limit),
      data: userHistory.slice(startIndex, startIndex + parseInt(limit))
    });
  } catch (error) {
    console.error('[ERROR] /api/user/:userId/history:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取用户统计数据
app.get('/api/user/:userId/statistics', (req, res) => {
  try {
    const userHistory = history.filter(r => r.userName === req.params.userId || r.userId === req.params.userId);
    const examRecords = userHistory.filter(r => r.isExam);
    const practiceRecords = userHistory.filter(r => !r.isExam);

    let totalWrongCount = 0;
    userHistory.forEach(r => {
      if (r.wrongCount) totalWrongCount += r.wrongCount;
    });

    let avgScore = 0;
    let passedCount = 0;

    if (examRecords.length > 0) {
      const totalScore = examRecords.reduce((sum, r) => sum + r.score, 0);
      avgScore = Math.round(totalScore / examRecords.length);
      passedCount = examRecords.filter(r => r.score >= 60).length;
    }

    res.json({
      totalQuestions: questions.length,
      byType: {
        trueFalse: questions.filter(q => q.type === 'true_false').length,
        choice: questions.filter(q => q.type === 'choice').length
      },
      historySummary: {
        totalExamRecords: examRecords.length,
        totalPracticeRecords: practiceRecords.length,
        totalWrongCount,
        avgScore,
        passedCount,
        passRate: examRecords.length > 0 ? Math.round((passedCount / examRecords.length) * 100) : 0
      }
    });
  } catch (error) {
    console.error('[ERROR] /api/user/:userId/statistics:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 清空历史记录
app.delete('/api/history', (req, res) => {
  try {
    history = [];
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);
    res.json({ message: '历史记录已清空' });
  } catch (error) {
    console.error('[ERROR] /api/history DELETE:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 清除部分缓存
app.post('/api/history/clear', (req, res) => {
  try {
    history = [];
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);
    res.json({ message: '部分缓存已清除（历史记录）' });
  } catch (error) {
    console.error('[ERROR] /api/history/clear:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 清除所有缓存
app.post('/api/cache/clear-all', (req, res) => {
  try {
    history = [];
    saveJSONFile(getFilePath(CONFIG.HISTORY_FILE), history);
    recentlyUsedIds.length = 0;
    res.json({ message: '所有缓存已清除' });
  } catch (error) {
    console.error('[ERROR] /api/cache/clear-all:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ============================================
// 启动服务器
// ============================================
initializeData();

app.listen(CONFIG.PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     河南省生态环境厅环境监测工勤技能考试系统 v2.0          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║     服务地址: http://localhost:${CONFIG.PORT}                    ║`);
  console.log(`║     题库总数: ${questions.length} 道题目                            ║`);
  console.log(`║     历史记录: ${history.length} 条                                 ║`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
});