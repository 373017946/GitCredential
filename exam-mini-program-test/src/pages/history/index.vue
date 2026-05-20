<template>
  <view class="page">
    <!-- 统计卡片 -->
    <view class="stats-container">
      <view class="stat-card">
        <text class="stat-value">{{ stats.avgScore || 0 }}%</text>
        <text class="stat-label">平均分</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.passRate || 0 }}%</text>
        <text class="stat-label">及格率</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.examTimes || 0 }}</text>
        <text class="stat-label">考试次数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.practiceTimes || 0 }}</text>
        <text class="stat-label">练习次数</text>
      </view>
    </view>

    <!-- 历史记录列表 -->
    <view class="history-list">
      <view v-if="historyList.length === 0" class="empty-state">
        <text class="empty-icon">📭</text>
        <text class="empty-text">暂无记录</text>
        <text class="empty-desc">开始练习或考试后，这里会显示您的历史成绩</text>
      </view>

      <view v-else>
        <view
          v-for="(item, index) in historyList"
          :key="index"
          class="history-item"
          @click="viewDetail(item)"
        >
          <view class="history-info">
            <view class="history-title">{{ item.isExam ? '模拟考试' : '练习' }}</view>
            <view class="history-meta">
              <text>{{ formatDate(item.createdAt) }}</text>
              <text class="separator">|</text>
              <text>用时: {{ formatDuration(item.duration) }}</text>
            </view>
            <view class="history-stats">
              <text class="correct">正确: {{ item.correctCount || 0 }}</text>
              <text class="wrong">错误: {{ item.wrongCount || 0 }}</text>
            </view>
          </view>
          <view :class="['history-score', item.score >= 60 ? 'high' : 'low']">
            {{ item.score }}分
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import api from '../../utils/api.js'

export default {
  data() {
    return {
      stats: {
        avgScore: 0,
        passRate: 0,
        examTimes: 0,
        practiceTimes: 0
      },
      historyList: []
    }
  },
  onLoad() {
    this.loadData()
  },
  onShow() {
    this.loadData()
  },
  methods: {
    async loadData() {
      try {
        // 获取统计数据
        let data
        try {
          const userId = api.getUserId()
          if (userId) {
            data = await api.getUserStatistics()
          } else {
            throw new Error('No userId')
          }
        } catch (e) {
          data = await api.getStatistics()
        }

        this.stats = {
          avgScore: data.historySummary?.avgScore || 0,
          passRate: data.historySummary?.passRate || 0,
          examTimes: data.historySummary?.totalExamRecords || 0,
          practiceTimes: data.historySummary?.totalPracticeRecords || 0
        }

        // 获取历史记录
        let historyData
        try {
          const userId = api.getUserId()
          if (userId) {
            historyData = await api.getUserHistory(50)
          } else {
            throw new Error('No userId')
          }
        } catch (e) {
          historyData = await api.getHistory({ limit: 50 })
        }

        this.historyList = historyData.data || []
      } catch (e) {
        console.error('加载数据失败:', e)
      }
    },
    formatDate(dateStr) {
      if (!dateStr) return ''
      const date = new Date(dateStr)
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    },
    formatDuration(seconds) {
      if (!seconds) return '0分0秒'
      const minutes = Math.floor(seconds / 60)
      const secs = seconds % 60
      return `${minutes}分${secs}秒`
    },
    viewDetail(item) {
      // 跳转到结果查看
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      currentPage.setData({
        examResults: {
          questions: [],
          results: [],
          score: item.score,
          correctCount: item.correctCount,
          wrongCount: item.wrongCount,
          passed: item.score >= 60,
          isExam: item.isExam,
          historyItem: item
        }
      })
      uni.navigateTo({ url: '/pages/review/index' })
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

.stats-container {
  display: flex;
  padding: 30rpx;
  gap: 20rpx;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.stat-value {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #2e7d32;
  margin-bottom: 10rpx;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #666;
}

.history-list {
  padding: 0 30rpx;
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

.history-item {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16rpx;
  padding: 36rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.history-info {
  flex: 1;
}

.history-title {
  font-size: 30rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 12rpx;
}

.history-meta {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 10rpx;
}

.separator {
  margin: 0 12rpx;
}

.history-stats {
  font-size: 24rpx;
}

.correct {
  color: #4caf50;
  margin-right: 20rpx;
}

.wrong {
  color: #f44336;
}

.history-score {
  font-size: 44rpx;
  font-weight: bold;
  padding: 20rpx 30rpx;
  border-radius: 12rpx;
}

.history-score.high {
  background: #e8f5e9;
  color: #2e7d32;
}

.history-score.low {
  background: #ffebee;
  color: #f44336;
}
</style>