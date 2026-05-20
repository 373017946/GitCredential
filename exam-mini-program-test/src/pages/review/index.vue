<template>
  <view class="page">
    <!-- 结果概览 -->
    <view class="result-overview">
      <view class="overview-score">{{ score }}%</view>
      <view :class="['overview-status', passed ? 'pass' : 'fail']">
        {{ passed ? '及格' : '不及格' }}
      </view>
      <view class="overview-detail">
        共 {{ totalCount }} 题，正确 {{ correctCount }} 题，错误 {{ wrongCount }} 题
      </view>
    </view>

    <!-- 答案列表 -->
    <view class="review-list">
      <view
        v-for="(item, index) in results"
        :key="index"
        :class="['review-item', item.isCorrect ? '' : 'wrong']"
      >
        <view class="review-header">
          <text class="review-number">{{ index + 1 }}</text>
          <text :class="['review-result', item.isCorrect ? 'correct' : 'wrong']">
            {{ item.isCorrect ? '✓ 正确' : '✗ 错误' }}
          </text>
        </view>

        <view class="review-content">{{ item.content }}</view>

        <!-- 选项 -->
        <view v-if="item.options && item.options.length > 0" class="review-options">
          <view
            v-for="(opt, idx) in item.options"
            :key="idx"
            :class="['review-option', getOptionClass(item, idx)]"
          >
            <text class="option-label">{{ ['A', 'B', 'C', 'D', 'E'][idx] }}.</text>
            <text class="option-text">{{ opt }}</text>
          </view>
        </view>

        <!-- 答案对比 -->
        <view class="review-answer">
          <text class="your-answer">您的答案: {{ formatAnswer(item.yourAnswer, item) }}</text>
          <text class="correct-answer">正确答案: {{ formatAnswer(item.correctAnswer, item) }}</text>
        </view>
      </view>
    </view>

    <!-- 底部按钮 -->
    <view class="btn-area">
      <button class="btn-home" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      score: 0,
      correctCount: 0,
      wrongCount: 0,
      totalCount: 0,
      passed: false,
      results: [],
      isExam: false
    }
  },
  onLoad() {
    // 从上一页面获取结果数据
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    const data = currentPage.data.examResults || {}

    if (data.questions && data.questions.length > 0) {
      // 从考试结果重建答案列表
      this.results = data.results || data.questions.map((q, i) => ({
        questionId: q.id,
        content: q.content,
        options: q.options,
        type: q.type,
        yourAnswer: '',
        correctAnswer: q.answer,
        isCorrect: false
      }))
      this.score = data.score
      this.correctCount = data.correctCount
      this.wrongCount = data.wrongCount
      this.totalCount = data.questions.length
      this.passed = data.passed
      this.isExam = data.isExam
    } else if (data.historyItem) {
      // 从历史记录查看详情
      this.score = data.historyItem.score
      this.correctCount = data.historyItem.correctCount
      this.wrongCount = data.historyItem.wrongCount
      this.totalCount = data.historyItem.totalCount
      this.passed = data.historyItem.score >= 60
      this.results = []
    }
  },
  methods: {
    getOptionClass(item, idx) {
      const labels = ['A', 'B', 'C', 'D', 'E']
      const label = labels[idx]
      if (item.correctAnswer === label) {
        return 'correct'
      }
      if (item.yourAnswer === label && item.yourAnswer !== item.correctAnswer) {
        return 'wrong'
      }
      return ''
    },
    formatAnswer(answer, item) {
      if (!answer) return '未答'
      if (item.type === 'true_false') {
        return answer === 'true' ? '正确' : '错误'
      }
      const labels = ['A', 'B', 'C', 'D', 'E']
      const idx = labels.indexOf(answer)
      return idx >= 0 ? `${answer}. ${item.options?.[idx] || ''}` : answer
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
  padding-bottom: 120rpx;
}

.result-overview {
  background: linear-gradient(135deg, #1b5e20, #2e7d32, #43a047);
  color: white;
  padding: 50rpx 30rpx;
  text-align: center;
}

.overview-score {
  font-size: 100rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.overview-status {
  display: inline-block;
  font-size: 30rpx;
  padding: 10rpx 40rpx;
  border-radius: 30rpx;
  margin-bottom: 20rpx;
}

.overview-status.pass {
  background: rgba(255, 255, 255, 0.2);
}

.overview-status.fail {
  background: rgba(244, 67, 54, 0.6);
}

.overview-detail {
  font-size: 26rpx;
  opacity: 0.9;
}

.review-list {
  padding: 30rpx;
}

.review-item {
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  border-left: 8rpx solid #4caf50;
}

.review-item.wrong {
  border-left-color: #f44336;
}

.review-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.review-number {
  width: 44rpx;
  height: 44rpx;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: bold;
  color: #666;
  margin-right: 16rpx;
}

.review-result {
  font-size: 26rpx;
  font-weight: bold;
}

.review-result.correct {
  color: #4caf50;
}

.review-result.wrong {
  color: #f44336;
}

.review-content {
  font-size: 30rpx;
  color: #333;
  line-height: 1.6;
  margin-bottom: 20rpx;
}

.review-options {
  margin-bottom: 20rpx;
}

.review-option {
  display: flex;
  padding: 16rpx 20rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
  margin-bottom: 10rpx;
}

.review-option.correct {
  background: #c8e6c9;
  border: 2rpx solid #4caf50;
}

.review-option.wrong {
  background: #ffcdd2;
  border: 2rpx solid #f44336;
}

.option-label {
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 12rpx;
  color: #333;
}

.option-text {
  font-size: 28rpx;
  color: #333;
}

.review-answer {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eee;
}

.your-answer {
  font-size: 26rpx;
  color: #f44336;
}

.correct-answer {
  font-size: 26rpx;
  color: #4caf50;
}

.btn-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 30rpx;
  background: white;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.btn-home {
  background: #4caf50;
  color: white;
  font-size: 32rpx;
  padding: 28rpx 0;
  border-radius: 12rpx;
  border: none;
}
</style>