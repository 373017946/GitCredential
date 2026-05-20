<template>
  <view class="page">
    <!-- 配置页面 -->
    <view v-if="!inPractice" class="config-page">
      <view class="config-card">
        <view class="config-title">📝 在线刷题</view>

        <view class="form-item">
          <text class="form-label">题目类型</text>
          <picker :value="typeIndex" :range="typeOptions" @change="onTypeChange">
            <view class="picker-value">{{ typeOptions[typeIndex] }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">题目分类</text>
          <picker :value="subjectIndex" :range="subjectOptions" @change="onSubjectChange">
            <view class="picker-value">{{ subjectOptions[subjectIndex] }}</view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">每次练习题数</text>
          <picker :value="countIndex" :range="countOptions" @change="onCountChange">
            <view class="picker-value">{{ countOptions[countIndex] }}</view>
          </picker>
        </view>

        <view class="btn-area">
          <button class="btn-start" @click="startPractice">开始练习</button>
        </view>
      </view>
    </view>

    <!-- 答题页面 -->
    <view v-else class="practice-page">
      <!-- 进度条 -->
      <view class="progress-bar">
        <view class="progress-info">
          <text>{{ currentIndex + 1 }} / {{ questions.length }}</text>
          <text>已答: {{ answeredCount }}</text>
        </view>
        <view class="progress-fill">
          <view class="fill" :style="{ width: progressPercent + '%' }"></view>
        </view>
      </view>

      <!-- 题目信息 -->
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
            :class="['option-item', { selected: selectedAnswer === option.value, correct: showResult && option.isCorrect, wrong: showResult && selectedAnswer === option.value && !option.isCorrect }]"
            @click="selectOption(option)"
          >
            <text class="option-label">{{ option.label }}</text>
            <text class="option-text">{{ option.text }}</text>
          </view>
        </view>

        <!-- 答题反馈 -->
        <view v-if="showResult" :class="['feedback', isCorrect ? 'correct' : 'wrong']">
          <text v-if="isCorrect">✓ 回答正确</text>
          <view v-else>
            <text>✗ 回答错误</text>
            <text class="correct-answer">正确答案：{{ correctAnswerLabel }}</text>
          </view>
        </view>

        <!-- 导航按钮 -->
        <view class="nav-buttons">
          <button class="btn-nav" :disabled="currentIndex === 0" @click="prevQuestion">上一题</button>
          <button v-if="currentIndex < questions.length - 1" class="btn-nav btn-next" @click="nextQuestion">下一题</button>
          <button v-else class="btn-nav btn-finish" @click="finishPractice">完成</button>
        </view>
      </view>
    </view>

    <!-- 结果页面 -->
    <view v-if="showResultPage" class="result-page">
      <view class="result-card">
        <view class="result-title">练习完成！</view>
        <view class="result-score">{{ score }}%</view>
        <view class="result-detail">共 {{ questions.length }} 题，正确 {{ correctCount }} 题，错误 {{ wrongCount }} 题</view>
        <view v-if="wrongCount > 0" class="result-tip">本次练习错了 {{ wrongCount }} 道题，可进入错题本反复练习</view>

        <view class="result-buttons">
          <button class="btn-result" @click="goToWrong">查看错题</button>
          <button class="btn-result btn-outline" @click="goHome">返回首页</button>
        </view>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-spinner"></view>
      <text>加载中...</text>
    </view>
  </view>
</template>

<script>
import api from '../../utils/api.js'

export default {
  data() {
    return {
      // 配置
      typeIndex: 0,
      subjectIndex: 0,
      countIndex: 1,
      typeOptions: ['全部类型', '判断题', '选择题'],
      subjectOptions: ['全部分类', '水和废水', '环境空气', '其他类'],
      countOptions: ['10题', '20题', '50题', '100题'],

      // 状态
      inPractice: false,
      loading: false,
      questions: [],
      currentIndex: 0,
      userAnswers: {},
      showResult: false,
      sessionWrongIds: [],

      // 结果
      showResultPage: false,
      correctCount: 0,
      wrongCount: 0,
      score: 0
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
          { label: '✓', value: 'true', text: '正确', isCorrect: q.answer === 'true' },
          { label: '✗', value: 'false', text: '错误', isCorrect: q.answer === 'false' }
        ]
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      return (q.options || []).map((opt, idx) => ({
        label: labels[idx] + '.',
        value: labels[idx],
        text: opt,
        isCorrect: q.answer === labels[idx]
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
    correctAnswerLabel() {
      const q = this.currentQuestion
      if (q.type === 'true_false') {
        return q.answer === 'true' ? '正确' : '错误'
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      const idx = labels.indexOf(q.answer)
      return idx >= 0 ? `${q.answer}. ${q.options?.[idx] || ''}` : q.answer
    },
    isCorrect() {
      const answer = this.userAnswers[this.currentIndex]
      return answer && answer.toUpperCase() === this.currentQuestion.answer?.toUpperCase()
    },
    answeredCount() {
      return Object.keys(this.userAnswers).length
    },
    progressPercent() {
      if (this.questions.length === 0) return 0
      return ((this.currentIndex + 1) / this.questions.length) * 100
    }
  },
  methods: {
    onTypeChange(e) {
      this.typeIndex = e.detail.value
    },
    onSubjectChange(e) {
      this.subjectIndex = e.detail.value
    },
    onCountChange(e) {
      this.countIndex = e.detail.value
    },
    async startPractice() {
      const typeMap = ['', 'true_false', 'choice']
      const subjectMap = ['', '水和废水', '环境空气', '其他类']
      const countMap = [10, 20, 50, 100]

      const params = {
        count: countMap[this.countIndex]
      }
      if (this.typeIndex > 0) {
        params.type = typeMap[this.typeIndex]
      }
      if (this.subjectIndex > 0) {
        params.subject = subjectMap[this.subjectIndex]
      }

      this.loading = true
      try {
        const questions = await api.getRandomQuestions(params.count, params)
        this.questions = questions
        this.currentIndex = 0
        this.userAnswers = {}
        this.sessionWrongIds = []
        this.showResult = false
        this.inPractice = true
        this.showResultPage = false
      } catch (e) {
        uni.showToast({ title: '加载题目失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },
    selectOption(option) {
      // 如果已经显示结果，不允许修改
      if (this.showResult) return

      this.userAnswers[this.currentIndex] = option.value
      this.showResult = true

      // 记录错题
      if (!this.isCorrect && !this.sessionWrongIds.includes(this.currentQuestion.id)) {
        this.sessionWrongIds.push(this.currentQuestion.id)
      }

      // 强制更新视图
      this.$forceUpdate()
    },
    prevQuestion() {
      if (this.currentIndex > 0) {
        this.currentIndex--
        this.showResult = !!this.userAnswers[this.currentIndex]
      }
    },
    nextQuestion() {
      if (this.currentIndex < this.questions.length - 1) {
        this.currentIndex++
        this.showResult = !!this.userAnswers[this.currentIndex]
      }
    },
    finishPractice() {
      // 计算结果
      let correct = 0
      let wrong = 0
      this.questions.forEach((q, i) => {
        const userAnswer = this.userAnswers[i]
        if (userAnswer && userAnswer.toUpperCase() === q.answer?.toUpperCase()) {
          correct++
        } else {
          wrong++
        }
      })

      this.correctCount = correct
      this.wrongCount = wrong
      this.score = Math.round((correct / this.questions.length) * 100)

      // 保存记录
      this.saveRecord()

      this.inPractice = false
      this.showResultPage = true
    },
    async saveRecord() {
      try {
        const userId = api.getUserId()
        await api.submitExam({
          answers: this.questions.map((q, i) => this.userAnswers[i] || ''),
          questionIds: this.questions.map(q => q.id),
          duration: 0,
          isExam: false
        })
      } catch (e) {
        console.error('保存记录失败:', e)
      }
    },
    goToWrong() {
      uni.navigateTo({ url: '/pages/wrong/index' })
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

.btn-area {
  margin-top: 50rpx;
}

.btn-start {
  background: linear-gradient(135deg, #4caf50, #2e7d32);
  color: white;
  font-size: 34rpx;
  padding: 28rpx 0;
  border-radius: 12rpx;
  border: none;
}

/* 答题页面 */
.practice-page {
  padding: 30rpx;
}

.progress-bar {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 16rpx;
}

.progress-fill {
  height: 8rpx;
  background: #e0e0e0;
  border-radius: 4rpx;
}

.fill {
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #81c784);
  border-radius: 4rpx;
  transition: width 0.3s;
}

.question-card {
  background: white;
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
  background: #e8f5e9;
  border: 2rpx solid #4caf50;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #2e7d32;
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

.option-item.selected {
  border-color: #4caf50;
  background: #e8f5e9;
}

.option-item.correct {
  border-color: #4caf50;
  background: #c8e6c9;
}

.option-item.wrong {
  border-color: #f44336;
  background: #ffcdd2;
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

.feedback {
  padding: 30rpx;
  border-radius: 12rpx;
  text-align: center;
  font-size: 30rpx;
  margin-bottom: 30rpx;
}

.feedback.correct {
  background: #e8f5e9;
  border: 2rpx solid #4caf50;
  color: #2e7d32;
}

.feedback.wrong {
  background: #ffebee;
  border: 2rpx solid #f44336;
  color: #c62828;
}

.correct-answer {
  display: block;
  margin-top: 16rpx;
  font-size: 26rpx;
}

.nav-buttons {
  display: flex;
  gap: 20rpx;
  justify-content: space-between;
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

.btn-nav.btn-next, .btn-nav.btn-finish {
  background: #4caf50;
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
  margin-bottom: 40rpx;
}

.result-score {
  font-size: 100rpx;
  font-weight: bold;
  color: #4caf50;
  margin-bottom: 20rpx;
}

.result-detail {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.result-tip {
  font-size: 26rpx;
  color: #f44336;
  margin-bottom: 40rpx;
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
  background: rgba(0, 0, 0, 0.5);
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