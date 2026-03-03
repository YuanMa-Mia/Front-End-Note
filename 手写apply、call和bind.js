
Function.prototype.myCall = function (context) {
  context = context || window;
  context.fn = this;
  const arg = [];
  for (let i = 1; i < arguments.length; i++) {
    arg.push('arguments[' + i + ']');
  }
  const result = eval('context.fn(' + arg + ')');
  delete context.fn;
  return result;
}

Function.prototype.myApply = function (context, arr) {
  context = context || window;
  context.fn = this;
  let result;
  if(!arr){
    result = context.fn();
  }else{
    const arg = [];
    for (let i = 0; i < arr.length; i++) {
      arg.push('arr[' + i + ']');
    }
    result = eval('context.fn(' + arg + ')');
  }
  delete context.fn;
  return result;
}

/**
 * 为什么不需要 context || window？
 * JavaScript 的 this 绑定规则由调用环境决定，而不是 bind 内部强制替换bind 的作用是预先绑定 this 值，但这个 this 值在调用时是否有效，取决于 运行时环境（strict mode or not）。
 * 在 非严格模式 下，如果 bind 传入 null 或 undefined，JS 引擎会自动将 this 替换为全局对象（如 window）。
 * 在 严格模式 下，this 就是 null 或 undefined，不会替换。
 * 所以：这个“替换为全局对象”的逻辑，是由 JS 引擎在函数调用时自动完成的，而不是由 bind 实现手动完成的。
 * 
 * 如果强制绑定喂window，会导致表现不符合规范。
 * 
 * @param {*} context 
 * @returns 
 */
Function.prototype.myBind = function(context){
    if (typeof this !== "function") {
      throw new Error("Function.prototype.bind - what is trying to be bound is not callable");
    }

    const self = this;
    const args = Array.prototype.slice.call(arguments, 1);
    const fBound = function(){
        const bindArgs = Array.prototype.slice.call(arguments);
        self.apply(this instanceof self ? this : context, args.concat(bindArgs));
    }
    const fNOP = function(){};
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
}