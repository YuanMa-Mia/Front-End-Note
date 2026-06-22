# Webpack 面试 QA 笔记

---

## Q1：一句话总结 Webpack 是什么？

**A：** Webpack 本质上是一个基于依赖图（Dependency Graph）的静态模块打包器，它从入口出发递归解析所有依赖，经过 Loader 转译和 Plugin 干预，最终将模块合并为浏览器可执行的 bundle。

---

## Q2：Webpack 的整体构建流程是什么？

**A：** Webpack 的构建流程分三个阶段：初始化、构建和生成。

**初始化阶段，** 合并 webpack.config.js 和命令行参数得到最终配置，创建全局唯一的 Compiler 对象，然后遍历配置中的 plugins 数组，依次调用每个 plugin 的 apply 方法，将 plugin 的逻辑挂载到 Compiler 的 hooks 上，为后续构建过程中的介入做好准备。

**构建阶段，** 创建 Compilation 实例来管理这一轮具体的构建任务。从 entry 指定的入口文件开始，先调用匹配的 Loader 对源码做转译，比如 babel-loader 把 JSX 转成 JS，然后用 acorn 将转译后的代码解析成 AST，遍历 AST 提取出所有的 import 和 require 依赖。对每个依赖模块递归执行同样的流程——Loader 转译、AST 解析、提取依赖——每个文件会被包装成一个 Module 对象，最终形成一张完整的模块依赖图。

**生成阶段，** 依赖图构建完成后，Webpack 根据 entry 配置和代码中的动态 import 将 Module 分配到不同的 Chunk 中——入口及其同步依赖组成 initial chunk，动态 import 的模块形成 async chunk，SplitChunksPlugin 还可以将多个 chunk 共同依赖的模块拆成 common chunk。然后对 Chunk 进行优化，包括 Terser 压缩和 Tree Shaking 标记的 dead code 删除，最后通过模板系统将每个 Chunk 中的模块代码拼接成最终的输出代码，写入文件系统生成 bundle 文件。

---

## Q3：Loader 和 Plugin 的区别是什么？

**A：**

**职责上，** Loader 是文件翻译器，Plugin 是流程控制器。Webpack 自身只认识 JS 和 JSON，所以遇到 CSS、TypeScript、图片这些文件，需要 Loader 把它们转换成 Webpack 能处理的 JS 模块。Plugin 解决的是另一类问题——在构建流程中需要做一些"额外的事"，比如生成 HTML 文件、提取 CSS 成独立文件、压缩代码、分析 bundle 体积等等，这些不是简单的文件格式转换，而是对构建过程本身的扩展。

**作用时机上，** Loader 只在构建阶段的模块解析环节工作，具体来说是在读取源文件之后、解析 AST 之前，对源码做转译。而 Plugin 可以介入构建的任何阶段，因为它是通过挂载到 Compiler 和 Compilation 的 hooks 上来工作的——初始化阶段可以介入、构建阶段可以介入、生成阶段可以介入、输出之后也可以介入，取决于你 tap 的是哪个 hook。

**实现方式上，** Loader 本质就是一个函数，接收源码字符串，返回转换后的字符串，是纯粹的输入输出管道。Plugin 是一个带 apply 方法的类，在初始化阶段 Webpack 会调用 `plugin.apply(compiler)`，Plugin 在这个方法里通过 Tapable 的 hooks 机制把自己的逻辑注册到对应的生命周期节点上，等构建过程走到那个节点时自动触发执行。

---

## Q4：Loader 的配置机制和常见 Loader 有哪些？

**A：** Loader 转译的目标就是 JavaScript（或者 Webpack 能理解的模块）。Webpack 自身只认识 JS 和 JSON，所以所有非 JS 文件都需要 Loader 把它"翻译"成 JS 模块。Loader 的产出不一定是最终的 JS，它可以是中间产物，交给链条中的下一个 Loader 继续处理，只要最后一个 Loader 输出的是 JS 就行。

配置方式是通过 `module.rules` 里的 `test` 字段用正则匹配文件后缀，不同的文件配不同的 Loader：

```javascript
module: {
  rules: [
    { test: /\.jsx?$/, use: 'babel-loader' },
    { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    { test: /\.(png|jpg)$/, type: 'asset/resource' },
  ]
}
```

常见 Loader 按类别：

- **转译类：** babel-loader（ES6+/JSX → ES5）、ts-loader 或 esbuild-loader（TypeScript → JS）、vue-loader（.vue 单文件组件解析）
- **样式类：** css-loader（解析 CSS 中的 `@import` 和 `url()` 为模块依赖）、style-loader（把 CSS 注入 DOM）、postcss-loader（自动加浏览器前缀等后处理）、sass-loader / less-loader（预处理器编译）
- **资源类：** Webpack5 内置了 Asset Modules，基本取代了之前的 file-loader 和 url-loader

注意：css-loader 的职责不是"加载 CSS"，而是把 CSS 文件中的 `@import`、`url()` 解析成 JS 模块的依赖关系。style-loader 才负责把 CSS 内容插入页面的 `<style>` 标签。生产环境一般不用 style-loader，而是用 MiniCssExtractPlugin.loader 把 CSS 提取成独立文件。

---

## Q5：Chunk、Bundle、Module 之间的关系？

**A：** Module 是最小单位，每个源文件就是一个 Module。Chunk 是 Webpack 内部的分组概念，一个 Chunk 包含一组有关联的 Module。Bundle 是最终输出的物理文件，一个 Chunk 通常对应一个 Bundle 文件。关系链是：多个 Module → 组成一个 Chunk → 输出为一个 Bundle。

---

## Q6：Chunk 的分配规则是怎样的？什么情况下会产生新的 Chunk？

**A：** 产生新 Chunk 有三种情况。第一，每个 entry 入口会产生一个 initial chunk，入口文件及其所有通过静态 import 和 require 引用的同步依赖都会被打进这个 chunk 里。第二，代码中出现动态 `import()` 时，被动态引入的模块会被单独拆成一个 async chunk，在运行时按需加载。第三，SplitChunksPlugin 会分析多个 chunk 之间的共同依赖，将重复引用的模块拆成 common chunk 来避免代码冗余。SplitChunksPlugin 在 Webpack4 之后是默认开启的，但默认只对 async chunk 生效，如果想对所有 chunk 都拆公共模块，需要配置 `chunks: 'all'`。

---

## Q7：动态 import 和静态 import/require 有什么区别？

**A：** 静态 import 和 require 在构建时就能确定依赖关系，Webpack 会把它们和入口文件打到同一个 Chunk 里。动态 import，即 `import('./a')` 这种写法，返回的是一个 Promise，Webpack 看到这个语法时会将其单独拆成一个 Chunk。浏览器运行到这行代码时才会发起网络请求去加载那个 chunk 文件。这就是代码分割（Code Splitting）最核心的机制。

---

## Q8：Compiler 和 Compilation 的关系是什么？为什么要这样设计？

**A：** Compiler 和 Compilation 是包含关系，不是"第一次用 Compiler、后续用 Compilation"。

**Compiler 永远只有一个**，从 Webpack 启动到结束它一直存在，管的是全局性的东西——配置信息、Plugin 注册、文件监听、最终输出，相当于"工厂的总控室"。

**每次构建（包括第一次）都会创建一个新的 Compilation**。第一次完整构建会创建一个 Compilation，dev 模式下改了一个文件触发重新编译又创建一个新的 Compilation。Compilation 管的是这一轮构建的具体细节——模块解析、依赖图构建、Chunk 生成、代码输出。

为什么这样设计？**关注点分离和资源复用。** Compiler 持有不会变的东西（配置、Plugin、文件系统引用），不需要每次构建都重新初始化。Compilation 持有会变的东西（模块状态、依赖关系），每次重建要从头来。如果揉在一个对象里，增量构建时根本分不清哪些状态该重置、哪些该保留。

---

## Q9：Tapable 的 hooks 机制是什么？

**A：** Tapable 是 Webpack 自己写的发布订阅库，比普通的 EventEmitter 强大的地方在于它加了流程控制能力。它定义了多种 Hook 类型来决定订阅者之间怎么协作：

- **SyncHook** → 同步串行执行，每个订阅者依次跑
- **SyncBailHook** → 同步串行 + 熔断，某个订阅者返回非 undefined 就停
- **SyncWaterfallHook** → 同步串行 + 传值，上一个的返回值传给下一个
- **AsyncSeriesHook** → 异步串行，上一个完成后下一个才开始
- **AsyncParallelHook** → 异步并行，所有订阅者同时启动

Webpack 在 Compiler 和 Compilation 上定义了大量的 hooks，覆盖构建过程的每个环节。Plugin 通过 `tap`（同步订阅）、`tapAsync`（异步回调订阅）、`tapPromise`（异步 Promise 订阅）把逻辑挂上去。Webpack 核心代码本身也通过 hooks 来组织，很多内置功能也是作为 Plugin 实现的，Webpack 的内核其实很薄。

---

## Q10：HMR（Hot Module Replacement）热更新的完整原理？

**A：** HMR 的完整链路是这样的。Webpack Dev Server 启动时会和浏览器建立一个 WebSocket 长连接，同时往打包产物里注入 HMR Runtime 代码。当源文件发生变更时，Webpack 对变更模块做增量编译，生成两个产物：一个是 manifest，JSON 格式，描述哪些 chunk 发生了变化；一个是 update chunk，包含变更模块的完整新代码（是完整代码，不是 diff）。编译完成后，Dev Server 通过 WebSocket 把本次构建的新 hash 推送给浏览器。浏览器端的 HMR Runtime 收到新 hash 后，通过 HTTP 请求先拉取 manifest 确认哪些 chunk 需要更新，再拉取对应的 update chunk 拿到新模块代码。拿到新代码后，HMR Runtime 用新模块替换掉模块缓存中的旧模块，然后执行 `module.hot.accept` 中定义的回调来处理副作用，比如 React 组件的重新渲染。如果某个模块没有定义 accept 处理，更新信号会沿着依赖链向上冒泡，直到找到一个能处理的模块为止；如果冒泡到入口都没人处理，就会 fallback 到整页刷新。

`module.hot.accept` 就是在模块代码里写的"更新处理器"：

```javascript
if (module.hot) {
  module.hot.accept('./app', () => {
    // 当 './app' 模块更新时，重新执行渲染
    const { render: newRender } = require('./app');
    newRender();
  });
}
```

平时写 React 不需要手动写，是因为 react-refresh-webpack-plugin 帮你自动注入了 accept 逻辑。

---

## Q11：Tree Shaking 的原理是什么？为什么只对 ESM 有效？

**A：** Tree Shaking 是在打包时移除未被使用的代码来减小 bundle 体积。它分两步完成：在构建阶段解析 AST 时，Webpack 会分析每个模块的 export 是否被其他模块 import 过，没有被引用的 export 会被标记为"unused harmony export"；在生成阶段，Terser 做压缩时会将这些被标记的代码作为 dead code 删除。所以 Tree Shaking 其实是 Webpack 标记加 Terser 删除两步配合完成的，这也是为什么只有 production 模式下才真正生效。

只对 ESM 有效是因为 ES Module 的 import/export 必须写在模块顶层，不能放在条件分支里，导出的绑定在编译期就完全确定了，所以 Webpack 能静态分析出哪些 export 被使用了。而 CommonJS 的 require 是运行时执行的函数调用，module.exports 是一个普通对象可以被动态修改，编译期无法确定最终导出了什么，所以做不了 Tree Shaking。

注意 Tree Shaking 标记的粒度不是"模块"，而是**模块中的 export**。一个模块可能导出了五个函数，你只 import 了其中两个，Tree Shaking 标记的是那三个没被引用的 export，而不是把整个模块标记掉。

还有一个相关的配置是 package.json 中的 `sideEffects` 字段。即使某个模块的 export 没被引用，如果这个模块有副作用（比如 polyfill 往全局挂东西），Webpack 默认不敢删它。设置 `"sideEffects": false` 就是告诉 Webpack 这个包里所有模块都没有副作用，可以放心地对未引用模块做整体移除。

---

## Q12：Terser 在哪个阶段工作？

**A：** Terser 工作在生成阶段（Seal）的优化环节，在 Compilation 的 `optimization` hooks 中。模块代码拼接成 Chunk 的输出代码之后，在写入文件系统之前，TerserPlugin 对产出的代码进行压缩——删除空格和注释、缩短变量名、移除 dead code（包括 Tree Shaking 标记的 unused export）。这也是为什么 development 模式下 Tree Shaking 不生效——因为 dev 模式不跑 Terser。

---

## Q13：Loader 的 pitch 阶段和两阶段执行模型是什么？

**A：** Loader 的执行分两个阶段：pitch 阶段（从左到右）和 normal 阶段（从右到左），pitch 永远先执行。

```
── pitch 阶段（从左到右）──────────────────
  loader-a.pitch() → loader-b.pitch() → loader-c.pitch()

── normal 阶段（从右到左）────────────────
  loader-c() → loader-b() → loader-a()
```

pitch 阶段的关键特性：如果某个 loader 的 pitch 方法返回了一个值，后续的 loader（pitch 和 normal）全部跳过，直接掉头回去走前面 loader 的 normal 阶段。这是一种"短路"机制。

**但大多数 loader 根本没有定义 pitch 方法**（比如 babel-loader、css-loader），在 pitch 阶段就是直接跳过。所以日常感知上就像是只有 normal 在从右到左跑。

**pitch 的本质作用：** normal 阶段的 loader 只能做"内容变换"——拿到上一个 loader 传来的字符串做转换再传出去，是线性管道。pitch 给了 loader 一个"抢先接管"的能力，可以跳过后续 loader 并重新编排模块依赖关系。只有像 style-loader 这种需要控制模块结构而不只是转换内容的 loader 才会用到。

---

## Q14：style-loader 如何利用 pitch 机制？

**A：** style-loader 的 pitch 返回的是一段 JS 代码字符串，里面包含 `require('!!css-loader!./app.css')`。但这段代码在 pitch 阶段并没有执行，它只是一段字符串。

**构建时：** Webpack 拿到这段 JS 字符串后解析其 AST，发现里面的 require，于是发起一次新的模块构建流程，用 css-loader 去处理 app.css。`!!` 前缀表示"跳过所有已配置的 loader，只用内联指定的 loader"，防止 style-loader 再次被匹配到导致死循环。

**运行时：** 浏览器执行这段代码时，require 已被替换成 `__webpack_require__`，从模块缓存拿到 css-loader 的处理结果，创建 `<style>` 标签插入 DOM。

本质上 style-loader 做的事情是把"在构建管道中串行处理"变成了"在模块依赖图中并行编排"。pitch 的返回值不是最终结果，而是一段"指令"，告诉 Webpack 接下来该怎么组织模块间的依赖关系。

---

## Q15：enforce 是什么？和 Loader 两阶段模型有什么关系？

**A：** enforce 控制的是同一个文件匹配到多个 rule 时，这些 rule 中 loader 的执行顺序。有两个值 `pre` 和 `post`，加上不设置（默认 normal），一共三类。

执行优先级（normal 阶段从后往前）：

```
post loader    ← 最后执行
normal loader  ← 中间执行
inline loader  ← （写在 import 里的，现在基本不用）
pre loader     ← 最先执行（如 eslint-loader 在 babel 转译前检查源码）
```

**enforce 和两阶段模型是正交的**，互不干扰但叠加在一起。enforce 先把 loader 分成 pre、normal、post 三组排好序，然后整个排好序的 loader 链条再走"pitch 从左到右、normal 从右到左"的两阶段模型：

```
pitch 阶段（从左到右）：pre.pitch → normal.pitch → post.pitch
normal 阶段（从右到左）：post() → normal() → pre()
```

enforce 决定的是流水线上工位的排列顺序，两阶段模型决定的是流水线的运行方式。

---

## Q16：命令行参数和配置文件参数重叠时，哪个优先级更高？

**A：** 命令行参数优先级更高。Webpack 的配置合并顺序是：默认配置 → 配置文件（webpack.config.js）→ 命令行参数，后面的覆盖前面的。比如配置文件写了 `mode: 'development'`，但执行 `webpack --mode production`，最终生效的是 production。这是业界通用惯例：配置文件是"常态设定"，命令行参数是"临时覆盖"。

---

## Q17：source map 是什么？生产环境怎么配置？

**A：** source map 是源码和打包产物之间的映射文件，让你在浏览器调试时能看到原始源码而不是压缩后的代码。Webpack 的 devtool 配置项控制生成哪种类型：

- **`false`** → 不生成任何 source map
- **`hidden-source-map`** → 生成 .map 文件，但 JS 里不引用它（用户不可见，上传给监控平台用）
- **`nosources-source-map`** → 生成 .map 文件，浏览器能看到文件名和行号，但看不到源码内容
- **`source-map`** → 生成完整的 .map 文件，JS 里引用它（开发用，生产别用）
- **`eval-cheap-module-source-map`** → 开发环境推荐，构建快，能定位到行

生产环境最佳实践：`hidden-source-map` + 把 .map 文件上传到 Sentry 等错误监控平台后从部署产物中删除，既不暴露源码又能定位线上问题。

---

## Q18：hash、chunkhash、contenthash 的区别？

**A：** hash 是整个项目级别的，任何文件变了所有输出文件的 hash 都变。chunkhash 是 chunk 级别的，同一个 chunk 内的文件共享 hash。contenthash 是文件内容级别的，只有文件自身内容变了 hash 才变。

实践中 JS 文件用 chunkhash，CSS 文件用 contenthash。为什么 CSS 不用 chunkhash？因为 CSS 是通过 MiniCssExtractPlugin 从 JS chunk 中提取出来的，如果用 chunkhash，JS 改了但 CSS 没改，CSS 文件的缓存也会失效。

---

## Q19：Webpack 怎么解析模块路径？

**A：** 当代码里写 `import lodash from 'lodash'`，Webpack 内部的 enhanced-resolve 模块负责找到实际文件路径。

如果是相对路径（`./utils`），按文件系统路径查找，依次尝试加上 `resolve.extensions` 配置的后缀（`.js`、`.ts`、`.jsx` 等）。

如果是裸模块名（`lodash`），去 node_modules 目录里找，先找当前目录的 node_modules，找不到就往父目录递归，和 Node.js 的模块解析规则一致。找到包目录后，确定加载哪个文件的优先级是：先看 package.json 的 `exports` 字段（Webpack5 支持，最精确，可针对不同环境指定不同入口），没有就看 `module` 字段（ESM 入口，可 Tree Shaking），再没有就看 `main` 字段（CommonJS 入口，兜底）。

可以通过 resolve 配置自定义：`resolve.alias` 配路径别名，`resolve.modules` 指定额外的模块搜索目录。

---

## Q20：Webpack 的模块化兼容方案是什么？

**A：** Webpack 让 ESM 和 CommonJS 在同一个 bundle 里共存的方式是把所有模块统一包装成自己内部的模块格式，通过 `__webpack_require__` 来加载。对于 ESM 的 export，Webpack 在 exports 对象上定义 `__esModule` 标记和对应的 getter；对于 CommonJS 的 module.exports，直接赋值。当 ESM 通过 `import` 引用 CommonJS 模块时，Webpack 用 `_interopRequireDefault` 或类似的辅助函数做兼容处理，确保 default import 能正确工作。

---

## Q21：Webpack5 相比 Webpack4 有哪些重要变化？

**A：** 最核心的三个变化：

- **持久化缓存（Persistent Cache）：** 内置文件系统级别缓存，设置 `cache: { type: 'filesystem' }` 后二次构建速度提升 80% 以上，Webpack4 需要依赖 hard-source-webpack-plugin 等第三方方案
- **Module Federation（模块联邦）：** 允许多个独立构建的应用在运行时共享模块，应用 A 可以直接远程加载应用 B 导出的组件，不需要先 npm 发包再安装，对微前端场景是革命性的
- **移除 Node.js polyfill 自动注入：** Webpack4 会自动给 `process`、`Buffer` 等 Node 模块做 polyfill，Webpack5 不再这么做，需要开发者显式处理，让 bundle 体积更可控

---

## Q22：Webpack 和 Vite 的核心区别是什么？

**A：** 核心区别在于开发阶段的模块处理方式完全不同。

Webpack 不管是开发还是生产，都是先把所有模块从入口开始递归解析、构建完整的依赖图、打包成 bundle，然后启动 dev server。项目越大这个过程越慢。

Vite 在开发阶段完全不做打包。它利用浏览器原生支持 ESM 的能力，启动 dev server 后浏览器请求哪个模块，Vite 就实时编译并返回哪个模块，所以冷启动极快。热更新也更快，因为只需要重新编译那一个模块。

但在生产构建阶段，Vite 底层用的是 Rollup（未来迁移到 Rolldown），因为浏览器原生 ESM 在生产环境下几百个模块意味着几百个 HTTP 请求，性能很差。所以生产阶段两者都做 bundle。

选型：新项目优先 Vite，开发体验好；存量大型项目如果有 Module Federation 等 Webpack 特有能力，继续用 Webpack 没问题。

---

## Q23：常见的 Webpack 优化手段有哪些？

**A：** 分两个方向：

**构建速度优化：**

- Webpack5 持久化缓存，配置 `cache: { type: 'filesystem' }`，二次构建速度提升 80%+
- 缩小 Loader 处理范围，通过 include/exclude 限定 babel-loader 只处理 src 目录
- 用 esbuild-loader 替代 babel-loader 和 terser，esbuild 是 Go 写的，速度快一个量级

**产物体积优化：**

- Tree Shaking 移除未使用的代码
- SplitChunksPlugin 拆公共模块避免重复打包
- 动态 import 做路由级别的代码分割实现按需加载

---

## Q24：30 秒电梯演讲

**A：** Webpack 要解决的核心问题是把浏览器不认识的各种模块（TS、JSX、SCSS 等）打包成可执行的产物。它的工作机制是从 entry 出发，递归解析依赖关系构建一张模块依赖图，过程中用 Loader 做文件转译，用基于 Tapable 的 Plugin 系统在构建各阶段做扩展，最终将模块分组为 Chunk 并输出 Bundle。几个关键设计点：依赖图保证了模块关系的完整性，Loader 的链式管道实现了关注点分离，Plugin 的 hooks 机制提供了极强的可扩展性。Webpack5 之后内置了持久化缓存和 Module Federation，前者大幅提升了二次构建速度，后者为微前端的模块共享提供了原生方案。
