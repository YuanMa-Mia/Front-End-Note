<!--
 * @Author: mayuan17 mayuan17@meituan.com
 * @Date: 2026-02-10 19:40:53
 * @LastEditors: mayuan17 mayuan17@meituan.com
 * @LastEditTime: 2026-02-11 17:00:59
 * @FilePath: /Front-End-Note/ServiceWork与webWorker.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
Service Worker: https://juejin.cn/post/7165893682132959245
Service Worker 是浏览器后台运行的独立线程（客户端脚本），通过拦截网络请求、管理缓存，实现离线访问、性能优化等功能。
使用举例：
PWA：实现离线访问和“添加到桌面”功能。
离线缓存：即使用户断网也能访问页面。
后台推送：接收服务器推送消息，显示通知。

Web Worker: https://juejin.cn/post/7160676211780714526