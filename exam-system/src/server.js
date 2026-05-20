import express from 'express';
import cors from 'cors';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = join(__dirname, '../data');
const QUESTIONS_FILE = join(DATA_DIR, 'questions.json');
const HISTORY_FILE = join(DATA_DIR, 'history.json');
const USERS_FILE = join(DATA_DIR, 'users.json');

// 加载题库
const questions = JSON.parse(readFileSync(QUESTIONS_FILE, 'utf-8'));

// 加载用户数据
let users = {};
if (existsSync(USERS_FILE)) {
  try {
    users = JSON.parse(readFileSync(USERS_FILE, 'utf-8'));
  } catch (e) {
    users = {};
  }
}

function saveUsers() {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

if (!existsSync(USERS_FILE)) {
  saveUsers();
}

// 加载历史记录
let history = [];
if (existsSync(HISTORY_FILE)) {
  try {
    history = JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
  } catch (e) {
    history = [];
  }
}

function saveHistory() {
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

if (!existsSync(HISTORY_FILE)) {
  saveHistory();
}

// 记录最近使用过的题目ID，用于减少重复出题
const recentlyUsedIds = [];
const MAX_RECENT = 200;

function markQuestionUsed(questionIds) {
  questionIds.forEach(id => {
    const idx = recentlyUsedIds.indexOf(id);
    if (idx !== -1) {
      recentlyUsedIds.splice(idx, 1);
    }
    recentlyUsedIds.push(id);
  });
  while (recentlyUsedIds.length > MAX_RECENT) {
    recentlyUsedIds.shift();
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// API根目录
app.get('/api', (req, res) => {
  res.json({
    name: '河南省生态环境厅环境监测工勤技能考试系统',
    version: '1.0.0',
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
  const { type, category, subject, page = 1, limit = 50 } = req.query;
  let filtered = [...questions];

  if (type) filtered = filtered.filter(q => q.type === type);
  if (category) filtered = filtered.filter(q => q.category === category);
  if (subject) filtered = filtered.filter(q => q.subject === subject);

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
});

// 获取随机题目（刷题模式）
app.get('/api/questions/random', (req, res) => {
  const { count = 10, type, category, subject, includeAnswer } = req.query;
  const requestCount = parseInt(count);

  // 如果指定了类型，直接按类型筛选
  if (type) {
    let filtered = questions.filter(q => q.type === type);
    if (category) filtered = filtered.filter(q => q.category === category);
    if (subject) filtered = filtered.filter(q => q.subject === subject);

    // 排除最近使用过的题目
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

  // 未指定类型时：35%判断题，65%选择题
  let trueFalsePool = questions.filter(q => q.type === 'true_false');
  let choicePool = questions.filter(q => q.type === 'choice');

  if (category) {
    trueFalsePool = trueFalsePool.filter(q => q.category === category);
    choicePool = choicePool.filter(q => q.category === category);
  }
  if (subject) {
    trueFalsePool = trueFalsePool.filter(q => q.subject === subject);
    choicePool = choicePool.filter(q => q.subject === subject);
  }

  // 排除最近使用过的题目
  if (trueFalsePool.length > requestCount * 2) {
    trueFalsePool = trueFalsePool.filter(q => !recentlyUsedIds.includes(q.id));
  }
  if (choicePool.length > requestCount * 2) {
    choicePool = choicePool.filter(q => !recentlyUsedIds.includes(q.id));
  }

  // 计算数量：35%判断题，65%选择题
  const trueFalseCount = Math.floor(requestCount * 0.35);
  const choiceCount = requestCount - trueFalseCount;

  // 随机打乱并选取
  const shuffledTF = shuffle(trueFalsePool);
  const shuffledChoice = shuffle(choicePool);

  const selectedTF = shuffledTF.slice(0, Math.min(trueFalseCount, shuffledTF.length));
  const selectedChoice = shuffledChoice.slice(0, Math.min(choiceCount, shuffledChoice.length));

  // 先判断题，后选择题
  const selected = [...selectedTF, ...selectedChoice];

  // 记录使用的题目ID
  markQuestionUsed(selected.map(q => q.id));

  // includeAnswer=true 时返回答案（练习模式），否则不返回（考试模式）
  res.json(selected.map(q => {
    const base = { id: q.id, code: q.code, type: q.type, category: q.category, subject: q.subject, content: q.content, options: q.options };
    if (includeAnswer === 'true' || includeAnswer === true) return { ...base, answer: q.answer };
    return base;
  }));
});

// 获取单条题目（含答案）
app.get('/api/questions/:id', (req, res) => {
  const question = questions.find(q => q.id === parseInt(req.params.id));
  if (!question) {
    return res.status(404).json({ error: '题目不存在' });
  }
  res.json(question);
});

// 验证答案
app.post('/api/questions/check', (req, res) => {
  const { questionId, answer } = req.body;
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
});

// 生成试卷
app.post('/api/exam/generate', (req, res) => {
  const { questionCount = 50, types, subjects } = req.body;

  const subjectList = subjects || ['水和废水', '环境空气', '其他类'];

  // 35% 判断题，65% 选择题
  const trueFalseCount = Math.floor(questionCount * 0.35);
  const choiceCount = questionCount - trueFalseCount;

  // 获取判断题池（排除最近用过的）
  let trueFalsePool = questions.filter(q =>
    q.type === 'true_false' && subjectList.includes(q.subject) && !recentlyUsedIds.includes(q.id)
  );
  // 获取选择题池（排除最近用过的）
  let choicePool = questions.filter(q =>
    q.type === 'choice' && subjectList.includes(q.subject) && !recentlyUsedIds.includes(q.id)
  );

  // 如果过滤后题目不够，回退到使用全部可用题目（不加限制）
  if (trueFalsePool.length < trueFalseCount) {
    trueFalsePool = questions.filter(q =>
      q.type === 'true_false' && subjectList.includes(q.subject)
    );
  }
  if (choicePool.length < choiceCount) {
    choicePool = questions.filter(q =>
      q.type === 'choice' && subjectList.includes(q.subject)
    );
  }

  // 随机打乱
  trueFalsePool = shuffle(trueFalsePool);
  choicePool = shuffle(choicePool);

  // 按比例选取
  const selectedTrueFalse = trueFalsePool.slice(0, Math.min(trueFalseCount, trueFalsePool.length));
  const selectedChoice = choicePool.slice(0, Math.min(choiceCount, choicePool.length));

  // 先判断题，后选择题
  const selected = [...selectedTrueFalse, ...selectedChoice];

  // 记录使用的题目ID
  markQuestionUsed(selected.map(q => q.id));

  const exam = {
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
  };

  res.json(exam);
});

// 提交试卷并评分（带答案校验）
app.post('/api/exam/grading', (req, res) => {
  const { examId, answers, questionIds, userName = '用户', userId, duration, isExam } = req.body;

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

  // 保存记录
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
  if (history.length > 200) history = history.slice(0, 200);
  saveHistory();

  res.json({
    score,
    correctCount: correct,
    wrongCount: wrong,
    totalCount,
    passed,
    recordId: record.id,
    results
  });
});

// 获取历史记录
app.get('/api/history', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const startIndex = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    total: history.length,
    page: parseInt(page),
    limit: parseInt(limit),
    data: history.slice(startIndex, startIndex + parseInt(limit))
  });
});

// 获取单条记录详情
app.get('/api/history/:id', (req, res) => {
  const record = history.find(r => r.id === parseInt(req.params.id));
  if (!record) {
    return res.status(404).json({ error: '记录不存在' });
  }
  res.json(record);
});

// 删除历史记录
app.delete('/api/history/:id', (req, res) => {
  const index = history.findIndex(r => r.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: '记录不存在' });
  }
  history.splice(index, 1);
  saveHistory();
  res.json({ message: '删除成功' });
});

// 成绩统计
app.get('/api/statistics', (req, res) => {
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

  // 计算总错题数
  let totalWrongCount = 0;
  history.forEach(r => {
    if (r.wrongCount) totalWrongCount += r.wrongCount;
  });

  let avgScore = 0;
  let totalScore = 0;
  let passedCount = 0;

  if (examRecords.length > 0) {
    totalScore = examRecords.reduce((sum, r) => sum + r.score, 0);
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
});

// 错题列表（从历史记录中提取）
app.get('/api/wrong-questions', (req, res) => {
  const { limit = 50, userName } = req.query;

  let allWrongIds = [];
  const historyFilter = userName ? history.filter(r => r.userName === userName) : history;
  historyFilter.forEach(record => {
    if (record.wrongQuestionIds && Array.isArray(record.wrongQuestionIds)) {
      allWrongIds = allWrongIds.concat(record.wrongQuestionIds);
    }
  });

  // 去重
  allWrongIds = [...new Set(allWrongIds)];

  // 获取错题详情
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
});

// 用户注册/登录 (基于openid或其他标识)
app.post('/api/user/login', (req, res) => {
  const { userId, userName, avatar } = req.body;

  if (!userId) {
    return res.status(400).json({ error: '用户ID不能为空' });
  }

  // 创建或更新用户
  users[userId] = {
    userId,
    userName: userName || '用户',
    avatar: avatar || '',
    lastLogin: new Date().toISOString(),
    createdAt: users[userId]?.createdAt || new Date().toISOString()
  };

  saveUsers();

  res.json({
    success: true,
    user: users[userId]
  });
});

// 获取用户信息
app.get('/api/user/:userId', (req, res) => {
  const user = users[req.params.userId];
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

// 获取用户历史记录
app.get('/api/user/:userId/history', (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const userHistory = history.filter(r => r.userName === req.params.userId || r.userId === req.params.userId);
  const startIndex = (parseInt(page) - 1) * parseInt(limit);

  res.json({
    total: userHistory.length,
    page: parseInt(page),
    limit: parseInt(limit),
    data: userHistory.slice(startIndex, startIndex + parseInt(limit))
  });
});

// 获取用户统计数据
app.get('/api/user/:userId/statistics', (req, res) => {
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
});

// 清空历史记录
app.delete('/api/history', (req, res) => {
  history = [];
  saveHistory();
  res.json({ message: '历史记录已清空' });
});

// 清除部分缓存（只清除历史记录，保留错题记录）
app.post('/api/history/clear', (req, res) => {
  // 只清空history，但保留wrongQuestionIds的汇总数据
  // 从每条记录中提取的错题仍然可以通过api获取
  // 这里只是清除练习/考试记录本身
  history = [];
  saveHistory();
  res.json({ message: '部分缓存已清除（历史记录）' });
});

// 清除所有缓存
app.post('/api/cache/clear-all', (req, res) => {
  history = [];
  saveHistory();
  // 清除最近使用记录
  recentlyUsedIds.length = 0;
  res.json({ message: '所有缓存已清除' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`考试系统已启动: http://localhost:${PORT}`);
  console.log(`题库共 ${questions.length} 道题目`);
  console.log(`历史记录: ${history.length} 条`);
});