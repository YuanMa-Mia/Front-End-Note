class MyPromise {
  constructor(executor) {
    this.state = 'pending'       // 三种状态：pending / fulfilled / rejected
    this.value = undefined       // fulfilled 时的值
    this.reason = undefined      // rejected 时的原因
    this.onFulfilledCallbacks = [] // 存储 then 注册的成功回调（处理异步 resolve 的情况）
    this.onRejectedCallbacks = []  // 存储 then 注册的失败回调

    // 为什么用箭头函数？保证 this 指向当前实例
    const resolve = (value) => {
      if (this.state !== 'pending') return  // 状态一旦改变就不可逆
      this.state = 'fulfilled'
      this.value = value
      // 状态变更后，依次执行之前存储的回调
      this.onFulfilledCallbacks.forEach(fn => fn())
    }

    const reject = (reason) => {
      if (this.state !== 'pending') return
      this.state = 'rejected'
      this.reason = reason
      this.onRejectedCallbacks.forEach(fn => fn())
    }

    // executor 同步执行，如果抛异常直接 reject
    try {
      executor(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }

  then(onFulfilled, onRejected) {
    // 参数透传：如果 then 没传回调，值要能"穿透"到下一个 then
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value
    onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }

    // then 必须返回一个新的 Promise（这是链式调用的基础）
    const promise2 = new MyPromise((resolve, reject) => {
      const fulfilledTask = () => {
        // 用 queueMicrotask 模拟异步（真实实现用微任务）
        queueMicrotask(() => {
          try {
            const x = onFulfilled(this.value)
            resolvePromise(promise2, x, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      }

      const rejectedTask = () => {
        queueMicrotask(() => {
          try {
            const x = onRejected(this.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (error) {
            reject(error)
          }
        })
      }

      // 根据当前状态决定是立即执行还是存起来等
      if (this.state === 'fulfilled') {
        fulfilledTask()
      } else if (this.state === 'rejected') {
        rejectedTask()
      } else {
        // pending 状态：说明 executor 里是异步 resolve 的
        // 先把回调存起来，等 resolve/reject 被调用时再执行
        this.onFulfilledCallbacks.push(fulfilledTask)
        this.onRejectedCallbacks.push(rejectedTask)
      }
    })

    return promise2
  }

  catch(onRejected) {
    return this.then(null, onRejected)
  }

  finally(callback) {
    return this.then(
      value => MyPromise.resolve(callback()).then(() => value),
      reason => MyPromise.resolve(callback()).then(() => { throw reason })
    )
  }
}

// 处理 then 回调返回值的核心逻辑
function resolvePromise(promise2, x, resolve, reject) {
  // 防止循环引用：then 的回调返回了 promise2 自身
  if (x === promise2) {
    return reject(new TypeError('Chaining cycle detected'))
  }

  // 如果返回值是 Promise 实例，等它 resolve/reject
  if (x instanceof MyPromise) {
    x.then(
      value => resolvePromise(promise2, value, resolve, reject), // 递归拆，防止 resolve 的还是 Promise
      reject
    )
    return;
  }
  // 如果返回值是 thenable（有 then 方法的对象）
  else if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    let called = false  // 防止 then 被多次调用
    try {
      const then = x.then
      if (typeof then === 'function') {
        then.call(x,
          y => {
            if (called) return
            called = true
            resolvePromise(promise2, y, resolve, reject) // 递归解析
          },
          r => {
            if (called) return
            called = true
            reject(r)
          }
        )
      } else {
        resolve(x)  // 普通对象，直接 resolve
      }
    } catch (error) {
      if (called) return
      called = true
      reject(error)
    }
  }
  // 普通值，直接 resolve
  else {
    resolve(x)
  }
}

MyPromise.resolve = function(value) {
  // 如果已经是 Promise，直接返回
  if (value instanceof MyPromise) return value
  // 否则包一层
  return new MyPromise(resolve => resolve(value))
}

MyPromise.reject = function(reason) {
  // 注意：reject 不管传入的是不是 Promise，都直接作为 reason
  return new MyPromise((_, reject) => reject(reason))
}

MyPromise.all = function(promises) {
  return new MyPromise((resolve, reject) => {
    const results = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve([])

    promises.forEach((p, index) => {
      // 用 Promise.resolve 包一层，兼容非 Promise 值
      MyPromise.resolve(p).then(
        value => {
          results[index] = value  // 用 index 而不是 push，保证顺序
          count++
          if (count === len) resolve(results)  // 全部完成才 resolve
        },
        reason => reject(reason)  // 任何一个失败就立即 reject
      )
    })
  })
}

MyPromise.race = function(promises) {
  return new MyPromise((resolve, reject) => {
    promises.forEach(p => {
      // 谁先完成（无论成功失败）就用谁的结果
      MyPromise.resolve(p).then(resolve, reject)
    })
  })
}

MyPromise.allSettled = function(promises) {
  return new MyPromise((resolve) => {
    const results = []
    let count = 0
    const len = promises.length

    if (len === 0) return resolve([])

    promises.forEach((p, index) => {
      MyPromise.resolve(p).then(
        value => {
          results[index] = { status: 'fulfilled', value }
          if (++count === len) resolve(results)
        },
        reason => {
          results[index] = { status: 'rejected', reason }
          if (++count === len) resolve(results)
        }
      )
    })
  })
}

MyPromise.any = function(promises) {
  return new MyPromise((resolve, reject) => {
    const errors = []
    let count = 0
    const len = promises.length

    if (len === 0) return reject(new AggregateError([], 'All promises were rejected'))

    promises.forEach((p, index) => {
      MyPromise.resolve(p).then(
        value => resolve(value),  // 任何一个成功就 resolve
        reason => {
          errors[index] = reason
          if (++count === len) {
            reject(new AggregateError(errors, 'All promises were rejected'))
          }
        }
      )
    })
  })
}