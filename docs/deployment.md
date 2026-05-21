# 部署指南

## 服务器部署

### 1. 环境要求

- Node.js >= 18.0.0
- HTTPS 证书（小程序要求）
- 域名已备案（微信小程序要求）

### 2. 安装步骤

```bash
cd exam-system
npm install
npm run db:init
npm run db:seed
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env`，修改以下配置：

```bash
PORT=3000
DB_PATH=./data/exam.db
JWT_SECRET=your-secret-key-change-in-production
WECHAT_APPID=wx-your-appid
WECHAT_SECRET=your-secret
ALLOWED_ORIGINS=https://your-domain.com
```

### 4. 启动服务

```bash
npm start
# 或使用 PM2
pm2 start src/server.js --name exam-system
```

### 5. Nginx 配置

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        root /path/to/exam-system/public;
        index index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 微信小程序部署

### 1. 配置 appid

编辑 `mini-program/project.config.json`，将 `YOUR_APPID` 替换为你的小程序 appid。

### 2. 配置服务器域名

在微信公众平台后台配置：
- 登录微信公众平台
- 开发 → 开发管理 → 开发设置
- 服务器域名白名单中添加你的 API 地址

### 3. 配置 API 地址

编辑 `mini-program/app.js`，将 `API_BASE` 替换为你的服务器地址：

```javascript
globalData: {
    API_BASE: 'https://your-domain.com/api'
}
```

### 4. 上传代码

使用微信开发者工具：
1. 打开 `mini-program` 目录
2. 点击"上传"按钮
3. 填写版本号和备注
4. 登录微信公众平台提交审核

---

## 数据库迁移

### 从 JSON 迁移（仅首次）

```bash
cd exam-system
npm run db:seed
```

### 数据备份

SQLite 数据库文件位置：`exam-system/data/exam.db`

定期备份该文件即可。

---

## 常见问题

### 1. 小程序提示"域名不在白名单"

需要在微信公众平台配置服务器域名白名单，包括：
- request 合法域名
- webview 合法域名

### 2. 微信登录失败

检查以下配置：
- 微信公众号是否已认证
- 小程序 appid 和 secret 是否正确
- 服务器是否支持 HTTPS

### 3. 题库导入失败

检查 `data/questions.json` 文件是否存在且格式正确。