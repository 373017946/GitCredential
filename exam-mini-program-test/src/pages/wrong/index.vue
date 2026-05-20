<template>
  <view class="page">
    <!-- 错题统计 -->
    <view class="wrong-header">
      <view class="wrong-title">📚 错题本</view>
      <view class="wrong-count">共 {{ wrongCount }} 道错题</view>
    </view>

    <!-- 错题列表 -->
    <view class="wrong-list">
      <view v-if="wrongQuestions.length === 0" class="empty-state">
        <text class="empty-icon">🎉</text>
        <text class="empty-text">暂无错题</text>
        <text class="empty-desc">做错的题目会自动收录到这里，方便您反复练习</text>
      </view>

      <view v-else>
        <view
          v-for="(q, index) in wrongQuestions"
          :key="q.id"
          class="wrong-item"
          @click="practiceQuestion(q)"
        >
          <view class="wrong-number">{{ index + 1 }}</view>
          <view class="wrong-content">
            <text class="question-text">{{ truncate(q.content, 50) }}</text>
            <view class="question-meta">
              <text class="question-type">{{ q.type === 'true_false' ? '判断题' : '选择题' }}</text>
              <text class="separator">|</text>
              <text class="question-subject">{{ q.subject }}</text>
            </view>
          </view>
          <text class="wrong-icon">✗</text>
        </view>
      </view>
    </view>

    <!-- 重新练习按钮 -->
    <view v-if="wrongQuestions.length > 0" class="btn-area">
      <button class="btn-retry" @click="retryAll">重新练习全部错题</button>
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
      loading: false,
      wrongQuestions: [],
      wrongCount: 0
    }
  },
  onLoad() {
    this.loadWrongQuestions()
  },
  onShow() {
    this.loadWrongQuestions()
  },
  methods: {
    async loadWrongQuestions() {
      this.loading = true
      try {
        // 从历史记录中提取错题
        let historyData
        try {
          const userId = api.getUserId()
          if (userId) {
            historyData = await api.getUserHistory(100)
          } else {
            throw new Error('No userId')
          }
        } catch (e) {
          historyData = await api.getHistory({ limit: 100 })
        }

        // 收集所有错题ID
        let allWrongIds = []
        if (historyData.data) {
          historyData.data.forEach(record => {
            if (record.wrongQuestionIds && Array.isArray(record.wrongQuestionIds)) {
              allWrongIds = allWrongIds.concat(record.wrongQuestionIds)
            }
          })
        }

        // 去重
        allWrongIds = [...new Set(allWrongIds)]
        this.wrongCount = allWrongIds.length

        // 获取错题详情（最多显示20道）
        const wrongDetails = []
        for (const id of allWrongIds.slice(0, 20)) {
          try {
            const q = await api.getQuestion(id)
            if (q) {
              wrongDetails.push(q)
            }
          } catch (e) {
            console.error('获取错题失败:', e)
          }
        }

        this.wrongQuestions = wrongDetails
      } catch (e) {
        console.error('加载错题失败:', e)
      } finally {
        this.loading = false
      }
    },
    truncate(str, len) {
      if (!str) return ''
      return str.length > len ? str.substring(0, len) + '...' : str
    },
    practiceQuestion(q) {
      // 开始单题练习
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      currentPage.setData({
        singleQuestion: q
      })
      uni.navigateTo({ url: '/pages/practice/single' })
    },
    async retryAll() {
      if (this.wrongQuestions.length === 0) {
        uni.showToast({ title: '暂无错题', icon: 'none' })
        return
      }

      // 存储错题IDs供练习页使用
      const wrongIds = this.wrongQuestions.map(q => q.id)
      uni.setStorageSync('retryWrongIds', wrongIds)

      uni.navigateTo({ url: '/pages/practice/retry' })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #f0f2f5;
  padding-bottom: 160rpx;
}

.wrong-header {
  background: linear-gradient(135deg, #1b5e20, #2e7d32, #43a047);
  color: white;
  padding: 40rpx 30rpx;
}

.wrong-title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 12rpx;
}

.wrong-count {
  font-size: 26rpx;
  opacity: 0.9;
}

.wrong-list {
  padding: 30rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
  background: white;
  border-radius: 16rpx;
}

.empty-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 30rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
}

.wrong-item {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.wrong-number {
  width: 56rpx;
  height: 56rpx;
  background: #ffebee;
  color: #f44336;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
  margin-right: 24rpx;
}

.wrong-content {
  flex: 1;
}

.question-text {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
  line-height: 1.5;
}

.question-meta {
  font-size: 24rpx;
  color: #999;
}

.question-type {
  margin-right: 12rpx;
}

.separator {
  margin-right: 12rpx;
}

.wrong-icon {
  font-size: 40rpx;
  color: #f44336;
  margin-left: 20rpx;
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

.btn-retry {
  background: #4caf50;
  color: white;
  font-size: 32rpx;
  padding: 28rpx 0;
  border-radius: 12rpx;
  border: none;
}

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