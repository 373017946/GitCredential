<template>
  <view class="page">
    <!-- 配置页面 -->
    <view v-if="!inExam && !showResultPage" class="config-page">
      <view class="config-card">
        <view class="config-title">📋 模拟考试</view>

        <view class="form-item">
          <text class="form-label">试卷题数</text>
          <picker :value="countIndex" :range="countOptions" @change="onCountChange">
            <view class="picker-value">{{ countOptions[countIndex] }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">考试时长</text>
          <picker :value="durationIndex" :range="durationOptions" @change="onDurationChange">
            <view class="picker-value">{{ durationOptions[durationIndex] }}</view>
          </picker>
        </view>

        <view class="exam-info">
          <text class="info-item">📌 35%判断题 + 65%选择题</text>
          <text class="info-item">📌 及格分数：60分</text>
          <text class="info-item">📌 交卷后显示成绩和答案</text>
        </view>

        <view class="btn-area">
          <button class="btn-start" @click="startExam">开始考试</button>
        </view>
      </view>
    </view>

    <!-- 考试答题页面 -->
    <view v-if="inExam" class="exam-page">
      <!-- 顶部信息栏 -->
      <view class="exam-header">
        <view class="exam-timer">
          <text class="timer-text">{{ timerDisplay }}</text>
          <text v-if="timeWarning" class="timer-warning">{{ timeWarning }}</text>
        </view>
        <view class="exam-info-bar">
          <text>{{ currentIndex + 1 }} / {{ questions.length }}</text>
          <text>已答: {{ answeredCount }}</text>
        </view>
      </view>

      <!-- 进度条 -->
      <view class="progress-fill-bar">
        <view class="fill" :style="{ width: progressPercent + '%' }"></view>
      </view>

      <!-- 题目卡片 -->
      <view class="question-card">
        <view class="question-header">
          <text class="question-type">{{ currentQuestion.type === 'true_false' ? '判断题' : '选择题' }}</text>
          <text class="question-subject">{{ currentQuestion.subject }}</text>
        </view>

        <view class="question-content">{{ currentQuestion.content }}</view>

        <!-- 已选答案显示 -->
        <view v-if="selectedAnswer" class="selected-answer">
          已选答案：{{ selectedAnswerLabel }}
        </view>

        <!-- 选项 -->
        <view class="options">
          <view
            v-for="(option, index) in currentOptions"
            :key="index"
            :class="['option-item', { selected: selectedAnswer === option.value, 'exam-selected': selectedAnswer === option.value }]"
            @click="selectOption(option)"
          >
            <text class="option-label">{{ option.label }}</text>
            <text class="option-text">{{ option.text }}</text>
          </view>
        </view>

        <!-- 答题卡 -->
        <view class="answer-card">
          <view class="answer-card-title">答题卡</view>
          <view class="answer-grid">
            <view
              v-for="(q, idx) in questions"
              :key="idx"
              :class="['answer-item', { answered: userAnswers[idx], current: idx === currentIndex }]"
              @click="jumpToQuestion(idx)"
            >
              {{ idx + 1 }}
            </view>
          </view>
          <view class="answer-legend">
            <view class="legend-item">
              <view class="legend-dot answered"></view>
              <text>已答</text>
            </view>
            <view class="legend-item">
              <view class="legend-dot unanswered"></view>
              <text>未答</text>
            </view>
          </view>
        </view>

        <!-- 导航按钮 -->
        <view class="nav-buttons">
          <button class="btn-nav" :disabled="currentIndex === 0" @click="prevQuestion">上一题</button>
          <button v-if="currentIndex < questions.length - 1" class="btn-nav" @click="nextQuestion">下一题</button>
          <button v-else class="btn-nav btn-submit" @click="confirmSubmit">交卷</button>
        </view>
      </view>
    </view>

    <!-- 结果页面 -->
    <view v-if="showResultPage" class="result-page">
      <view class="result-card">
        <view class="result-title">{{ isExam ? '考试完成！' : '练习完成！' }}</view>
        <view class="result-score">{{ score }}%</view>
        <view class="result-status" :class="{ pass: passed, fail: !passed }">
          {{ passed ? '及格' : '不及格' }}
        </view>
        <view class="result-detail">共 {{ questions.length }} 题，正确 {{ correctCount }} 题，错误 {{ wrongCount }} 题</view>

        <view class="result-buttons">
          <button class="btn-result" @click="reviewResults">查看答案</button>
          <button class="btn-result btn-outline" @click="goHome">返回首页</button>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner"></view>
      <text>正在生成试卷，请稍候...</text>
    </view>
  </view>
</template>

<script>
import api from '../../utils/api.js'

export default {
  data() {
    return {
      // 配置
      countIndex: 0,
      durationIndex: 0,
      countOptions: ['50题', '100题'],
      durationOptions: ['30分钟', '60分钟', '90分钟'],
      durationMap: [30, 60, 90],

      // 状态
      inExam: false,
      loading: false,
      showResultPage: false,
      isExam: true,
      questions: [],
      currentIndex: 0,
      userAnswers: {},
      examStartTime: null,
      timerInterval: null,
      timeWarning: '',

      // 结果
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      passed: false,
      results: []
    }
  },
  computed: {
    currentQuestion() {
      return this.questions[this.currentIndex] || {}
    },
    currentOptions() {
      const q = this.currentQuestion
      if (q.type === 'true_false') {
        return [
          { label: '✓ 正确', value: 'true', text: '正确' },
          { label: '✗ 错误', value: 'false', text: '错误' }
        ]
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      return (q.options || []).map((opt, idx) => ({
        label: labels[idx] + '.',
        value: labels[idx],
        text: opt
      }))
    },
    selectedAnswer() {
      return this.userAnswers[this.currentIndex] || null
    },
    selectedAnswerLabel() {
      const answer = this.selectedAnswer
      if (!answer) return ''
      if (this.currentQuestion.type === 'true_false') {
        return answer === 'true' ? '正确' : '错误'
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      const idx = labels.indexOf(answer)
      return idx >= 0 ? `${answer}. ${this.currentQuestion.options?.[idx] || ''}` : answer
    },
    answeredCount() {
      return Object.keys(this.userAnswers).length
    },
    progressPercent() {
      if (this.questions.length === 0) return 0
      return ((this.currentIndex + 1) / this.questions.length) * 100
    },
    timerDisplay() {
      const elapsed = Math.floor((Date.now() - this.examStartTime) / 1000)
      const totalSeconds = this.durationMap[this.durationIndex] * 60
      const remaining = Math.max(0, totalSeconds - elapsed)
      const minutes = Math.floor(remaining / 60)
      const seconds = remaining % 60
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }
  },
  onUnload() {
    this.clearTimer()
  },
  onBackPress() {
    if (this.inExam) {
      this.confirmExit()
      return true
    }
    return false
  },
  methods: {
    onCountChange(e) {
      this.countIndex = e.detail.value
    },
    onDurationChange(e) {
      this.durationIndex = e.detail.value
    },
    async startExam() {
      const countMap = [50, 100]
      const questionCount = countMap[this.countIndex]

      this.loading = true
      try {
        const data = await api.generateExam(questionCount)
        this.questions = data.questions || []
        this.currentIndex = 0
        this.userAnswers = {}
        this.examStartTime = Date.now()
        this.inExam = true
        this.showResultPage = false

        // 开始计时器
        this.startTimer()
      } catch (e) {
        uni.showToast({ title: '生成试卷失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    startTimer() {
      this.timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - this.examStartTime) / 1000)
        const totalSeconds = this.durationMap[this.durationIndex] * 60
        const remaining = totalSeconds - elapsed

        // 显示剩余5分钟警告
        if (remaining <= 300 && remaining > 0) {
          this.timeWarning = `剩余${Math.ceil(remaining / 60)}分钟`
        } else {
          this.timeWarning = ''
        }

        // 时间到自动交卷
        if (remaining <= 0) {
          this.clearTimer()
          uni.showToast({ title: '考试时间到，系统将自动交卷！', icon: 'none' })
          setTimeout(() => this.submitExam(), 1500)
        }
      }, 1000)
    },
    clearTimer() {
      if (this.timerInterval) {
        clearInterval(this.timerInterval)
        this.timerInterval = null
      }
    },
    selectOption(option) {
      this.userAnswers[this.currentIndex] = option.value
      this.$forceUpdate()
    },
    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
      }
    },
    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
      }
    },
    jumpToQuestion(index) {
      this.currentIndex = index
    },
    confirmSubmit() {
      const unanswered = this.questions.length - this.answeredCount
      let msg = '确定要提交试卷吗？'
      if (unanswered > 0) {
        msg += `\n还有 ${unanswered} 题未作答。`
      }
      uni.showModal({
        title: '确认交卷',
        content: msg,
        success: (res) => {
          if (res.confirm) {
            this.submitExam()
          }
        }
      })
    },
    confirmExit() {
      uni.showModal({
        title: '确认退出',
        content: '确定要退出吗？退出后本次考试成绩将不会保存。',
        success: (res) => {
          if (res.confirm) {
            this.clearTimer()
            this.inExam = false
            uni.navigateTo({ url: '/pages/index/index' })
          }
        }
      })
      return false
    },
    async submitExam() {
      this.clearTimer()

      // 计算本地结果
      const answers = this.questions.map((q, i) => this.userAnswers[i] || '')
      const questionIds = this.questions.map(q => q.id)
      const duration = Math.floor((Date.now() - this.examStartTime) / 1000)

      try {
        const result = await api.submitExam({
          answers,
          questionIds,
          duration,
          isExam: true
        })

        this.score = result.score || 0
        this.correctCount = result.correctCount || 0
        this.wrongCount = result.wrongCount || 0
        this.passed = result.passed || false
        this.results = result.results || []
      } catch (e) {
        // 计算本地结果
        let correct = 0
        const results = []
        this.questions.forEach((q, i) => {
          const userAnswer = this.userAnswers[i]
          const isCorrect = userAnswer && userAnswer.toUpperCase() === q.answer?.toUpperCase()
          if (isCorrect) correct++
          results.push({
            questionId: q.id,
            content: q.content,
            options: q.options,
            type: q.type,
            yourAnswer: userAnswer || '',
            correctAnswer: q.answer,
            isCorrect: !!isCorrect
          })
        })
        this.correctCount = correct
        this.wrongCount = this.questions.length - correct
        this.score = Math.round((correct / this.questions.length) * 100)
        this.passed = this.score >= 60
        this.results = results
      }

      this.inExam = false
      this.showResultPage = true
    },
    reviewResults() {
      // 保存当前考试结果到全局，供结果页使用
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      currentPage.setData({
        examResults: {
          questions: this.questions,
          results: this.results,
          score: this.score,
          correctCount: this.correctCount,
          wrongCount: this.wrongCount,
          passed: this.passed,
          isExam: this.isExam
        }
      })

      uni.navigateTo({ url: '/pages/review/index' })
    },
    goHome() {
      uni.navigateTo({ url: '/pages/index/index' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f0f2f5;
  padding-bottom: 40rpx;
}

/* 配置页面 */
.config-page {
  padding: 30rpx;
}

.config-card {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.config-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 40rpx;
  padding-bottom: 20rpx;
  border-bottom: 4rpx solid #4caf50;
}

.form-item {
  margin-bottom: 36rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.picker-value {
  background: #f5f5f5;
  padding: 24rpx 30rpx;
  border-radius: 12rpx;
  font-size: 30rpx;
}

.exam-info {
  background: #fff3e0;
  border-radius: 12rpx;
  padding: 24rpx;
  margin: 30rpx 0;
}

.info-item {
  display: block;
  font-size: 26rpx;
  color: #e65100;
  margin-bottom: 12rpx;
}

.info-item:last-child {
  margin-bottom: 0;
}

.btn-area {
  margin-top: 40rpx;
}

.btn-start {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  font-size: 34rpx;
  padding: 28rpx 0;
  border-radius: 12rpx;
  border: none;
}

/* 考试答题页面 */
.exam-page {
  padding: 0;
}

.exam-header {
  background: linear-gradient(135deg, #d32f2f, #c62828);
  color: white;
  padding: 30rpx;
}

.exam-timer {
  text-align: center;
  margin-bottom: 16rpx;
}

.timer-text {
  font-size: 48rpx;
  font-weight: bold;
}

.timer-warning {
  display: block;
  font-size: 24rpx;
  color: #ffeb3b;
  margin-top: 8rpx;
}

.exam-info-bar {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  opacity: 0.9;
}

.progress-fill-bar {
  height: 8rpx;
  background: rgba(255,255,255,0.3);
}

.fill {
  height: 100%;
  background: #fff;
  transition: width 0.3s;
}

.question-card {
  background: white;
  margin: 30rpx;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.question-header {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.question-type {
  background: #e8f5e9;
  color: #2e7d32;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.question-subject {
  background: #fff3e0;
  color: #e65100;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}

.question-content {
  font-size: 32rpx;
  line-height: 1.7;
  color: #222;
  margin-bottom: 30rpx;
}

.selected-answer {
  background: #fffde7;
  border: 2rpx solid #f5c842;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #e65100;
  margin-bottom: 24rpx;
}

.options {
  margin-bottom: 30rpx;
}

.option-item {
  display: flex;
  align-items: center;
  padding: 28rpx 30rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  margin-bottom: 16rpx;
  border: 2rpx solid transparent;
}

.option-item.selected, .option-item.exam-selected {
  border-color: #f5c842;
  background: #fffde7;
}

.option-label {
  font-size: 30rpx;
  font-weight: bold;
  margin-right: 16rpx;
  color: #333;
}

.option-text {
  font-size: 30rpx;
  color: #333;
}

/* 答题卡 */
.answer-card {
  background: #f5f5f5;
  border-radius: 12rpx;
  padding: 24rpx;
  margin-bottom: 30rpx;
}

.answer-card-title {
  font-size: 28rpx;
  font-weight: bold;
  color: #666;
  margin-bottom: 16rpx;
}

.answer-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.answer-item {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8rpx;
  font-size: 26rpx;
  font-weight: bold;
  border: 2rpx solid transparent;
}

.answer-item.unanswered {
  background: #bbdefb;
  color: #1565c0;
  border-color: #64b5f6;
}

.answer-item.answered {
  background: #ef9a9a;
  color: #c62828;
  border-color: #e57373;
}

.answer-item.current {
  border-color: #4caf50;
  box-shadow: 0 0 0 4rpx rgba(76, 175, 80, 0.3);
}

.answer-legend {
  display: flex;
  gap: 30rpx;
  margin-top: 20rpx;
  font-size: 22rpx;
  color: #666;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.legend-dot {
  width: 24rpx;
  height: 24rpx;
  border-radius: 4rpx;
}

.legend-dot.answered {
  background: #ef9a9a;
}

.legend-dot.unanswered {
  background: #bbdefb;
}

.nav-buttons {
  display: flex;
  gap: 20rpx;
}

.btn-nav {
  flex: 1;
  padding: 24rpx 0;
  font-size: 30rpx;
  border-radius: 12rpx;
  background: #f5f5f5;
  color: #666;
}

.btn-nav[disabled] {
  opacity: 0.5;
}

.btn-nav.btn-submit {
  background: #f44336;
  color: white;
}

/* 结果页面 */
.result-page {
  padding: 60rpx 30rpx;
}

.result-card {
  background: white;
  border-radius: 20rpx;
  padding: 60rpx 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.result-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 30rpx;
}

.result-score {
  font-size: 100rpx;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 20rpx;
}

.result-status {
  display: inline-block;
  font-size: 32rpx;
  padding: 12rpx 40rpx;
  border-radius: 30rpx;
  margin-bottom: 30rpx;
}

.result-status.pass {
  background: #e8f5e9;
  color: #2e7d32;
}

.result-status.fail {
  background: #ffebee;
  color: #f44336;
}

.result-detail {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 50rpx;
}

.result-buttons {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.btn-result {
  background: #4caf50;
  color: white;
  font-size: 32rpx;
  padding: 28rpx 0;
  border-radius: 12rpx;
  border: none;
}

.btn-result.btn-outline {
  background: white;
  color: #4caf50;
  border: 2rpx solid #4caf50;
}

/* 加载中 */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.loading-spinner {
  width: 60rpx;
  height: 60rpx;
  border: 4rpx solid #fff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-mask text {
  color: white;
  margin-top: 20rpx;
  font-size: 28rpx;
}
</style>