import { defineConfig } from '@uni-helper/unh'

export default defineConfig({
  platform: {
    default: 'mp-weixin',
    alias: {
      'h5': ['w', 'h'],
      'mp-weixin': ['wx', 'weixin', 'mp-weixin'],
    },
  },
})