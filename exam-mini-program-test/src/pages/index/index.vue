<template>
  <view class="page">
    <!-- 顶部标题 -->
    <view class="header">
      <view class="title-area">
        <text class="title">河南省生态环境厅</text>
        <text class="subtitle">环境监测工勤技能考试系统</text>
      </view>
    </view>

    <!-- 统计卡片 -->
    <view class="stats-container">
      <view class="stat-card">
        <text class="stat-value">{{ stats.totalQuestions || 0 }}</text>
        <text class="stat-label">总题数</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.trueFalse || 0 }}</text>
        <text class="stat-label">判断题</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.choice || 0 }}</text>
        <text class="stat-label">选择题</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ stats.wrongCount || 0 }}</text>
        <text class="stat-label">错题数</text>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-container">
      <view class="menu-item" @click="goToPractice">
        <view class="menu-icon">📝</view>
        <view class="menu-info">
          <text class="menu-title">在线刷题</text>
          <text class="menu-desc">按分类练习题目，实时查看答案</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="goToExam">
        <view class="menu-icon">📋</view>
        <view class="menu-info">
          <text class="menu-title">模拟考试</text>
          <text class="menu-desc">随机组卷，计时考试</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="goToHistory">
        <view class="menu-icon">📊</view>
        <view class="menu-info">
          <text class="menu-title">成绩统计</text>
          <text class="menu-desc">查看历史练习和考试成绩</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="goToWrong">
        <view class="menu-icon">📚</view>
        <view class="menu-info">
          <text class="menu-title">错题本</text>
          <text class="menu-desc">查看并练习做错的题目</text>
          <view class="wrong-badge" v-if="stats.wrongCount > 0">{{ stats.wrongCount }}</view>
        </view>
        <text class="menu-arrow">›</text>
      </view>

      <view class="menu-item" @click="clearCache">
        <view class="menu-icon">🗑️</view>
        <view class="menu-info">
          <text class="menu-title">清除缓存</text>
          <text class="menu-desc">清除本地存储和服务器缓存</text>
        </view>
        <text class="menu-arrow">›</text>
      </view>
    </view>

    <!-- 底部版本信息 -->
    <view class="footer">
      <text class="version">v1.0.0</text>
    </view>
  </view>
</template>

<script>
import api from '../../utils/api.js'

export default {
  data() {
    return {
      stats: {
        totalQuestions: 0,
        trueFalse: 0,
        choice: 0,
        wrongCount: 0
      }
    }
  },
  onLoad() {
    this.loadStats()
  },
  onShow() {
    this.loadStats()
  },
  methods: {
    async loadStats() {
      try {
        // 尝试获取用户统计数据
        let data
        try {
          const userId = api.getUserId()
          if (userId) {
            const res = await api.getUserStatistics()
            data = res
          } else {
            throw new Error('No userId')
          }
        } catch (e) {
          // 使用全局统计
          data = await api.getStatistics()
        }

        this.stats = {
          totalQuestions: data.totalQuestions || 0,
          trueFalse: data.byType?.trueFalse || 0,
          choice: data.byType?.choice || 0,
          wrongCount: data.historySummary?.totalWrongCount || 0
        }
      } catch (e) {
        console.error('加载统计数据失败:', e)
      }
    },
    goToPractice() {
      uni.navigateTo({
        url: '/pages/practice/index'
      })
    },
    goToExam() {
      uni.navigateTo({
        url: '/pages/exam/index'
      })
    },
    goToHistory() {
      uni.navigateTo({
        url: '/pages/history/index'
      })
    },
    goToWrong() {
      uni.navigateTo({
        url: '/pages/wrong/index'
      })
    },
    clearCache() {
      uni.showModal({
        title: '确认清除',
        content: '确定要清除所有缓存吗？这将删除本地存储和服务器缓存。',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 清除本地存储
              uni.clearStorageSync()
              // 尝试清除服务器缓存
              try {
                await api.clearAllCache()
              } catch (e) {
                console.log('服务器缓存清除失败', e)
              }
              uni.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
              // 重新加载统计数据
              this.loadStats()
            } catch (e) {
              uni.showToast({
                title: '清除失败',
                icon: 'none'
              })
            }
          }
        }
      })
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

.header {
  background: linear-gradient(135deg, #1b5e20, #2e7d32, #43a047);
  padding: 60rpx 40rpx 80rpx;
  color: white;
}

.title-area {
  text-align: center;
}

.title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  opacity: 0.9;
}

.stats-container {
  display: flex;
  justify-content: space-between;
  padding: 0 30rpx;
  margin-top: -50rpx;
  margin-bottom: 30rpx;
}

.stat-card {
  flex: 1;
  background: white;
  border-radius: 16rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  margin: 0 10rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.stat-value {
  display: block;
  font-size: 44rpx;
  font-weight: bold;
  color: #2e7d32;
  margin-bottom: 10rpx;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #666;
}

.menu-container {
  padding: 0 30rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 16rpx;
  padding: 36rpx 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  position: relative;
}

.menu-icon {
  font-size: 48rpx;
  margin-right: 30rpx;
}

.menu-info {
  flex: 1;
}

.menu-title {
  display: block;
  font-size: 32rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 10rpx;
}

.menu-desc {
  display: block;
  font-size: 24rpx;
  color: #999;
}

.wrong-badge {
  position: absolute;
  top: 24rpx;
  right: 80rpx;
  background: #f44336;
  color: white;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.menu-arrow {
  font-size: 40rpx;
  color: #ccc;
}

.footer {
  text-align: center;
  padding: 40rpx 0;
}

.version {
  font-size: 24rpx;
  color: #ccc;
}
</style>