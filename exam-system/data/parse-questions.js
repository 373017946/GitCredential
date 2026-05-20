import * as fs from 'fs';
import * as path from 'path';

const baseDir = 'e:/ClaudeCode开发的项目/02信阳市生态环境局环境监测员考试宝典/河南省生态环境厅环境监测工勤技能考试定稿';

const files = [
  { name: '题库_上册_判断题_水和废水.doc', type: 'true_false', category: 'water_waste', subject: '水和废水' },
  { name: '题库_上册_判断题_其他类.doc', type: 'true_false', category: 'other', subject: '其他类' },
  { name: '题库_上册_选择题_水和废水.doc', type: 'choice', category: 'water_waste', subject: '水和废水' },
  { name: '题库_上册_选择题_其他类.doc', type: 'choice', category: 'other', subject: '其他类' },
  { name: '题库_下册_判断题_环境空气.doc', type: 'true_false', category: 'air', subject: '环境空气' },
  { name: '题库_下册_判断题_其他类.doc', type: 'true_false', category: 'other', subject: '其他类' },
  { name: '题库_下册_选择题_环境空气.doc', type: 'choice', category: 'air', subject: '环境空气' },
  { name: '题库_下册_选择题_其他类.doc', type: 'choice', category: 'other', subject: '其他类' },
];

function parseTrueFalse(lines) {
  const questions = [];
  let currentContent = '';
  let id = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '判断题' || trimmed.startsWith('===')) {
      continue;
    }

    if (trimmed.match(/^[\【\[]\d+[\】\]]/)) {
      if (currentContent) {
        const parsed = parseTrueFalseQuestion(currentContent, id);
        if (parsed) {
          questions.push(parsed);
          id++;
        }
      }
      currentContent = trimmed;
    } else if (trimmed) {
      currentContent += ' ' + trimmed;
    }
  }

  if (currentContent) {
    const parsed = parseTrueFalseQuestion(currentContent, id);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return questions;
}

function parseTrueFalseQuestion(content, id) {
  const codeMatch = content.match(/^[\【\[](\d+)[\】\]]/);
  if (!codeMatch) return null;

  const code = codeMatch[1];

  let answer = '';
  const answerMatch = content.match(/答案[：:]\s*(正确|错误|对|错|true|false)/i);
  if (answerMatch) {
    const rawAnswer = answerMatch[1].toLowerCase();
    if (rawAnswer === '正确' || rawAnswer === '对' || rawAnswer === 'true') {
      answer = 'true';
    } else if (rawAnswer === '错误' || rawAnswer === '错' || rawAnswer === 'false') {
      answer = 'false';
    }
  }

  if (!answer) return null;

  let questionContent = content
    .replace(/^[\【\[]\d+[\】\]]/, '')
    .replace(/^\d+．/, '')
    .replace(/\(.*$/, '')
    .trim();

  questionContent = questionContent.replace(/答案[：:]\s*(正确|错误|对|错).*$/i, '').trim();

  return {
    id,
    code,
    type: 'true_false',
    category: '',
    subject: '',
    content: questionContent,
    answer
  };
}

function parseChoice(lines) {
  const questions = [];
  let currentBlock = [];
  let id = 1;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === '选择题' || trimmed.startsWith('===')) {
      continue;
    }

    if (trimmed.match(/^[\【\[]\d+[\】\]]/)) {
      if (currentBlock.length > 0) {
        const parsed = parseChoiceQuestion(currentBlock.join(' '), id);
        if (parsed) {
          questions.push(parsed);
          id++;
        }
      }
      currentBlock = [trimmed];
    } else if (trimmed) {
      currentBlock.push(trimmed);
    }
  }

  if (currentBlock.length > 0) {
    const parsed = parseChoiceQuestion(currentBlock.join(' '), id);
    if (parsed) {
      questions.push(parsed);
    }
  }

  return questions;
}

function parseChoiceQuestion(content, id) {
  const codeMatch = content.match(/^[\【\[](\d+)[\】\]]/);
  if (!codeMatch) return null;

  const code = codeMatch[1];

  const answerMatch = content.match(/答案[：:]\s*([A-D])/i);
  if (!answerMatch) return null;
  const answer = answerMatch[1].toUpperCase();

  // 提取选项 - 每个选项单独匹配
  const options = [];
  // 匹配 A. 或 A．或 A、后面跟着内容，直到下一个选项或答案
  const optionPattern = /([A-E])[．.、]\s*((?:[^A-E答案：:\n]|(?:(?![A-E][．.、])[^\n]))+)/g;
  let match;
  while ((match = optionPattern.exec(content)) !== null) {
    let optContent = match[2].trim();
    // 清理末尾的答案标记
    optContent = optContent.replace(/\s*答案[：:]\s*[A-E]?.*$/i, '').trim();
    if (optContent) {
      options.push(optContent);
    }
  }

  let questionContent = content
    .replace(/^[\【\[]\d+[\】\]]/, '')
    .replace(/^\d+．/, '')
    .replace(/\(.*$/, '')
    .trim();

  questionContent = questionContent.replace(/答案[：:]\s*[A-E].*$/i, '').trim();
  questionContent = questionContent.replace(/[A-E][．.、]\s*((?:[^A-E答案：:\n]|(?:(?![A-E][．.、])[^\n]))+)/g, '').trim();

  return {
    id,
    code,
    type: 'choice',
    category: '',
    subject: '',
    content: questionContent,
    options: options.length > 0 ? options : undefined,
    answer
  };
}

const allQuestions = [];
let globalId = 1;

for (const file of files) {
  const filePath = path.join(baseDir, file.name);
  if (!fs.existsSync(filePath)) {
    console.log(`文件不存在: ${filePath}`);
    continue;
  }

  console.log(`\n正在解析: ${file.name}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  let questions;
  if (file.type === 'true_false') {
    questions = parseTrueFalse(lines);
  } else {
    questions = parseChoice(lines);
  }

  for (const q of questions) {
    q.id = globalId++;
    q.category = file.category;
    q.subject = file.subject;
    allQuestions.push(q);
  }

  console.log(`  -> 解析完成: ${questions.length} 道题目`);
}

const outputPath = path.join(baseDir, 'exam-system/data/questions.json');
fs.writeFileSync(outputPath, JSON.stringify(allQuestions, null, 2), 'utf-8');

console.log(`\n========================================`);
console.log(`导入完成，总计: ${allQuestions.length} 道题目`);
console.log(`数据已保存至: ${outputPath}`);
console.log(`========================================`);

const trueFalseCount = allQuestions.filter(q => q.type === 'true_false').length;
const choiceCount = allQuestions.filter(q => q.type === 'choice').length;
console.log(`判断题: ${trueFalseCount} 道`);
console.log(`选择题: ${choiceCount} 道`);