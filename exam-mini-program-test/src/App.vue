<template>
  <view class="container">
    <router-view />
  </view>
</template>

<script>
export default {
  onLaunch() {
    console.log('App Launch')
    // 检查登录状态
    this.checkLogin()
  },
  onShow() {
    console.log('App Show')
  },
  onHide() {
    console.log('App Hide')
  },
  methods: {
    checkLogin() {
      const userId = uni.getStorageSync('userId')
      if (!userId) {
        // 生成临时用户ID
        const tempUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        uni.setStorageSync('userId', tempUserId)
      }
    }
  }
}
</script>

<style>
page {
  background-color: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.container {
  width: 100%;
  min-height: 100vh;
}
</style>