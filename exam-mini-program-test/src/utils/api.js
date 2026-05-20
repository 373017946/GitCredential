const API_BASE = 'http://192.168.0.183:3000/api'

// 获取用户ID（使用微信openid或本地生成）
function getUserId() {
  return uni.getStorageSync('userId') || ''
}

function setUserId(id) {
  uni.setStorageSync('userId', id)
}

function getUserName() {
  return uni.getStorageSync('userName') || '用户'
}

function setUserName(name) {
  uni.setStorageSync('userName', name)
}

// 获取用户OpenId (微信登录)
function getOpenId() {
  return uni.getStorageSync('openId') || ''
}

function setOpenId(openid) {
  uni.setStorageSync('openId', openid)
}

// 通用请求方法
function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const userId = getUserId()
    const header = {
      'Content-Type': 'application/json'
    }
    if (userId) {
      header['X-User-Id'] = userId
    }

    uni.request({
      url: API_BASE + url,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data)
        } else {
          reject({ errMsg: res.errMsg || '请求失败', statusCode: res.statusCode })
        }
      },
      fail: (err) => {
        reject({ errMsg: err.errMsg || '网络请求失败', code: err.code })
      }
    })
  })
}

// API 方法
export default {
  // 获取系统信息
  getSystemInfo() {
    return request('/')
  },

  // 获取题目列表（分页）
  getQuestions(params = {}) {
    return request('/questions', 'GET', params)
  },

  // 获取随机题目（刷题模式）
  getRandomQuestions(count = 10, params = {}) {
    let url = `/questions/random?count=${count}&includeAnswer=true`
    if (params.type) url += `&type=${params.type}`
    if (params.subject) url += `&subject=${params.subject}`
    return request(url)
  },

  // 获取单条题目
  getQuestion(id) {
    return request(`/questions/${id}`)
  },

  // 生成试卷
  generateExam(questionCount = 50) {
    return request('/exam/generate', 'POST', { questionCount })
  },

  // 提交评分
  submitExam(data) {
    return request('/exam/grading', 'POST', {
      examId: Date.now(),
      answers: data.answers,
      questionIds: data.questionIds,
      userId: getUserId(),
      userName: getUserName(),
      duration: data.duration,
      isExam: data.isExam || false
    })
  },

  // 获取历史记录
  getHistory(params = {}) {
    return request('/history', 'GET', params)
  },

  // 获取用户历史
  getUserHistory(limit = 20) {
    const userId = getUserId()
    if (userId) {
      return request(`/user/${userId}/history?limit=${limit}`)
    }
    return request(`/history?limit=${limit}`)
  },

  // 获取统计数据
  getStatistics() {
    return request('/statistics')
  },

  // 获取用户统计数据
  getUserStatistics() {
    const userId = getUserId()
    if (userId) {
      return request(`/user/${userId}/statistics`)
    }
    return request('/statistics')
  },

  // 用户登录/注册
  login(userId, userName, avatar = '') {
    return request('/user/login', 'POST', { userId, userName, avatar })
  },

  // 获取错题列表
  getWrongQuestions(limit = 50) {
    const userId = getUserId()
    const params = userId ? { limit, userName: userId } : { limit }
    return request('/wrong-questions', 'GET', params)
  },

  // 清除历史记录
  clearHistory() {
    return request('/history/clear', 'POST')
  },

  // 清除所有缓存
  clearAllCache() {
    return request('/cache/clear-all', 'POST')
  },

  // 本地存储操作
  getUserId,
  setUserId,
  getUserName,
  setUserName,
  getOpenId,
  setOpenId
}