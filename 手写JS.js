/*
 * @Author: mayuan17 mayuan17@meituan.com
 * @Date: 2026-03-02 20:32:19
 * @LastEditors: mayuan17 mayuan17@meituan.com
 * @LastEditTime: 2026-06-15 16:19:21
 * @FilePath: /Front-End-Note/手写JS.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
Function.prototype.myCall = function (context) {
  // 为什么要执行如下判断：依赖 context 是一个对象，避免 this 为 null 或 undefined 时报错
  // 更完善的实现和考虑：
  /**
   * context = context === null || context === undefined ? (thisArgMode === 'strict' ? context : globalThis) : Object(context);
   */
  context = context || window;
  context.fn = this;
  const arg = [];
  for (let i = 1; i < arguments.length; i++) {
    arg.push("arguments[" + i + "]");
  }
  const result = eval("context.fn(" + arg + ")");
  delete context.fn;
  return result;
};

Function.prototype.myApply = function (context, arr) {
  context = context || window;
  context.fn = this;
  let result;
  if (!arr) {
    result = context.fn();
  } else {
    const arg = [];
    for (let i = 0; i < arr.length; i++) {
      arg.push("arr[" + i + "]");
    }
    result = eval("context.fn(" + arg + ")");
  }
  delete context.fn;
  return result;
};

/**
 * 为什么不需要 context || window？
 * JavaScript 的 this 绑定规则由调用环境决定，而不是 bind 内部强制替换bind 的作用是预先绑定 this 值，但这个 this 值在调用时是否有效，取决于 运行时环境（strict mode or not）。
 * 在 非严格模式 下，如果 bind 传入 null 或 undefined，JS 引擎会自动将 this 替换为全局对象（如 window）。
 * 在 严格模式 下，this 就是 null 或 undefined，不会替换。
 * 所以：这个“替换为全局对象”的逻辑，是由 JS 引擎在函数调用时自动完成的，而不是由 bind 实现手动完成的。（apply执行时也会处理的）
 *
 * 如果强制绑定喂window，会导致表现不符合规范。
 *
 * @param {*} context
 * @returns
 */
Function.prototype.myBind = function (context) {
  if (typeof this !== "function") {
    throw new Error(
      "Function.prototype.bind - what is trying to be bound is not callable",
    );
  }

  const self = this;
  const args = Array.prototype.slice.call(arguments, 1);
  const fBound = function () {
    const bindArgs = Array.prototype.slice.call(arguments);
    self.apply(this instanceof self ? this : context, args.concat(bindArgs));
  };
  const fNOP = function () {};
  fNOP.prototype = this.prototype;
  fBound.prototype = new fNOP();
  return fBound;
};

// 手写实现new
function myNew() {
  const Constructor = [].shift.call(arguments);
  if (typeof Constructor !== "function") {
    throw new TypeError("Constructor is not a function");
  }
  const obj = Object.create(Constructor.prototype);
  const result = Constructor.apply(obj, arguments);
  return result !== null && (typeof result === "object" || typeof result === "function") ? result : obj;
}

// 防抖
function debounce(fn, delay = 500) {
    // timer 是在闭包中的
    let timer = null;
    
    return function() {
        clearTimeout(timer);
        timer = setTimeout(() => {
            fn.apply(this, arguments)
            timer = null
        }, delay)
    }
}
// 支持立即执行的防抖函数
function debounce2(fn, delay = 500, immediate = false) {
    // timer 是在闭包中的
    let timer = null;
    
    return function() {
        clearTimeout(timer);
        if(immediate){
          const callNow = !timer;
          // 在冷却期内多次触发会取消之前的延迟调用
          timer = setTimeout(() => {
            timer = null
          }, delay)
          if (callNow) {
            result = fn.apply(this, arguments)
          }
        } else {
            timer = setTimeout(() => {
                fn.apply(this, arguments)
                timer = null
            }, delay)
        }
        return result;
    }
}

// 节流
function throttle(fn, delay = 500) {
    let timer = null;
    
    return function() {
        if (timer) {
            return
        }
        timer = setTimeout(() => {
            fn.apply(this, arguments)
            timer = null
        }, delay)
    }
}


function myInstanceof(left, right) {
  // right 必须是函数，否则没有 prototype
  if (typeof right !== 'function') {
    throw new TypeError('Right-hand side is not callable')
  }

  // 基本类型直接返回 false（null 也会在这里被拦截）
  if (left === null || typeof left !== 'object' && typeof left !== 'function') {
    return false
  }

  const proto = right.prototype  // 目标：找到这个对象
  let cur = Object.getPrototypeOf(left)  // 从 left 的原型开始找

  while (cur !== null) {
    if (cur === proto) return true
    cur = Object.getPrototypeOf(cur)  // 沿原型链向上
  }

  return false
}
