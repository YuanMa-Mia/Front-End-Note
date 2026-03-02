# JavaScript 中 `this` 的指向

## 一、核心原则

**`this` 的指向由函数如何被调用决定，而不是在哪里定义。**

- **普通函数**：`this` 由调用者决定
- **箭头函数**：`this` 由定义时的外层作用域决定（无法改变）

## 二、五种常见情况

### 1. 全局/普通函数调用 - `this` 指向 `window`

```javascript
function show() {
  console.log(this);
}

show();  // this = window（非严格模式）或 undefined（严格模式）
```

### 2. 对象方法调用 - `this` 指向对象

```javascript
const obj = {
  name: 'obj',
  show: function() {
    console.log(this.name);  // 'obj'
  }
};

obj.show();  // this = obj
```

**陷阱**：方法被赋值给变量后，调用者改变
```javascript
const fn = obj.show;
fn();  // this = window（丢失了对象引用）

// 解决：使用 bind
const fn = obj.show.bind(obj);
fn();  // this = obj
```

### 3. 构造函数调用 - `this` 指向新对象

```javascript
function Person(name) {
  this.name = name;
}

const person = new Person('Alice');
console.log(person.name);  // 'Alice'，this = person
```

### 4. 箭头函数 - `this` 继承外层作用域

```javascript
const obj = {
  name: 'obj',
  show: function() {
    const arrow = () => {
      console.log(this.name);  // 'obj'（继承 show 的 this）
    };
    arrow();
  }
};

obj.show();  // this = obj
```

**特点**：箭头函数的 `this` 无法通过 `call/apply/bind` 改变
```javascript
const arrow = () => console.log(this);
arrow.call(obj);  // 仍然是全局 this，call 对箭头函数无效
```

### 5. 显式绑定 - `this` 指向指定对象

```javascript
function show() {
  console.log(this.name);
}

const obj = { name: 'obj' };

// call：立即调用
show.call(obj);  // this = obj

// apply：立即调用（参数为数组）
show.apply(obj, [arg1, arg2]);  // this = obj

// bind：返回新函数，之后调用
const fn = show.bind(obj);
fn();  // this = obj
```

## 三、`this` 指向优先级

从**最高到最低**：

1. **`new` 绑定** → `this = 新创建的对象`
2. **显式绑定** → `call/apply/bind` → `this = 指定对象`
3. **隐式绑定** → 对象方法调用 → `this = 调用对象`
4. **默认绑定** → 普通函数调用 → `this = window`（非严格模式）

## 四、回调函数中的 `this`

### 问题：普通函数回调中的 `this` 丢失

```javascript
const obj = {
  name: 'obj',
  show: function() {
    setTimeout(function() {
      console.log(this.name);  // undefined（this = window）
    }, 1000);
  }
};

obj.show();
```

### 解决方案

**方案 1：使用箭头函数** ✅ 推荐
```javascript
const obj = {
  name: 'obj',
  show: function() {
    setTimeout(() => {
      console.log(this.name);  // 'obj'（继承 show 的 this）
    }, 1000);
  }
};

obj.show();
```

**方案 2：保存 `this` 引用**
```javascript
const obj = {
  name: 'obj',
  show: function() {
    const self = this;  // 保存 this
    setTimeout(function() {
      console.log(self.name);  // 'obj'
    }, 1000);
  }
};

obj.show();
```

**方案 3：使用 `bind`**
```javascript
const obj = {
  name: 'obj',
  show: function() {
    setTimeout(function() {
      console.log(this.name);  // 'obj'
    }.bind(this), 1000);
  }
};

obj.show();
```

## 五、快速判断方法

按照以下顺序依次检查：

```
1. 是否有 new？
   → 是：this = 新对象 ✓

2. 是否有 call/apply/bind？
   → 是：this = 指定对象 ✓

3. 是否是箭头函数？
   → 是：this = 外层作用域的 this ✓

4. 是否由对象调用？
   → 是：this = 调用对象 ✓

5. 默认情况
   → this = window（非严格模式）或 undefined（严格模式）
```

## 六、常见陷阱与解决

| 陷阱 | 现象 | 解决方案 |
|------|------|--------|
| **对象方法赋值** | `const fn = obj.method; fn()` 中 `this = window` | 使用 `bind`：`obj.method.bind(obj)` |
| **回调函数的 this** | `setTimeout(function() { this })` 中 `this = window` | 使用箭头函数：`setTimeout(() => { this })` |
| **对象中的箭头函数** | `{ method: () => {} }` 中 `this` 不是对象 | 改用普通函数：`{ method: function() {} }` |
| **忘记 `new`** | `Person()` 中 `this = window`，污染全局 | 记得使用 `new`：`new Person()` |
| **`call/apply` 对箭头函数无效** | 箭头函数的 `this` 无法改变 | 使用普通函数或改变外层 `this` |

## 七、对比示例

### 普通函数 vs 箭头函数

```javascript
const obj = {
  name: 'obj',
  
  // 普通函数：this 由调用者决定
  normalFunc: function() {
    console.log(this.name);
  },
  
  // 箭头函数：this = 全局（对象不是作用域）
  arrowFunc: () => {
    console.log(this.name);  // undefined（this = window）
  }
};

obj.normalFunc();  // 'obj'
obj.arrowFunc();   // undefined
```

### 嵌套函数中的 `this`

```javascript
const obj = {
  name: 'obj',
  outer: function() {
    console.log('outer:', this.name);  // 'obj'
    
    // 普通函数：this = window
    function inner() {
      console.log('inner:', this.name);  // undefined
    }
    inner();
    
    // 箭头函数：继承 outer 的 this
    const arrow = () => {
      console.log('arrow:', this.name);  // 'obj'
    };
    arrow();
  }
};

obj.outer();
```

## 八、总结

| 方式 | `this` 指向 | 能否改变 |
|------|----------|--------|
| 普通函数 | 调用者 | ✅ 能（call/apply/bind） |
| 箭头函数 | 外层作用域 | ❌ 不能 |
| 对象方法 | 对象 | ✅ 能（改变调用者） |
| 构造函数 | 新对象 | ❌ 不能 |
| 回调函数 | 通常 window | ✅ 能（用箭头函数或 bind） |

## 九、记住这三点

1. **`this` 由调用方式决定**，不是定义位置
2. **箭头函数没有自己的 `this`**，继承外层
3. **优先级**：`new` > `call/apply/bind` > 对象方法 > 默认

## 十、经典面试题

### 题目一：对象中的混合函数

```javascript
var name = 'window'

var person1 = {
  name: 'person1',
  show1: function () {
    console.log(this.name)
  },
  show2: () => console.log(this.name),
  show3: function () {
    return function () {
      console.log(this.name)
    }
  },
  show4: function () {
    return () => console.log(this.name)
  }
}

var person2 = { name: 'person2' }
```

**执行结果分析：**

```javascript
person1.show1()              // person1（对象方法调用，this = person1）
person1.show1.call(person2)  // person2（call 改变 this）

person1.show2()              // window（箭头函数继承全局 this）
person1.show2.call(person2)  // window（call 对箭头函数无效）

person1.show3()()            // window（返回的函数独立调用，this = window）
person1.show3().call(person2)// person2（call 改变返回函数的 this）
person1.show3.call(person2)()// window（返回函数调用时 this = window）

person1.show4()()            // person1（返回的箭头函数继承 show4 的 this）
person1.show4().call(person2)// person1（call 对箭头函数无效，继承 show4 的 this）
person1.show4.call(person2)()// person2（先 call 改变 show4 的 this，箭头函数继承它）
```

**关键点：**
- `show1`：普通函数，`this` 由调用方式决定
- `show2`：箭头函数定义在对象上，`this = 全局`（对象不是作用域）
- `show3`：返回普通函数，该函数独立调用时 `this = window`
- `show4`：返回箭头函数，继承外层函数的 `this`

---

### 题目二：构造函数中的混合函数

```javascript
var name = 'window'

function Person(name) {
  this.name = name;
  this.show1 = function () {
    console.log(this.name)
  }
  this.show2 = () => console.log(this.name)
  this.show3 = function () {
    return function () {
      console.log(this.name)
    }
  }
  this.show4 = function () {
    return () => console.log(this.name)
  }
}

var personA = new Person('personA')
var personB = new Person('personB')
```

**执行结果分析：**

```javascript
personA.show1()              // personA（对象方法调用，this = personA）
personA.show1.call(personB)  // personB（call 改变 this）

personA.show2()              // personA（箭头函数继承构造函数的 this）
personA.show2.call(personB)  // personA（call 对箭头函数无效）

personA.show3()()            // window（返回的函数独立调用，this = window）
personA.show3().call(personB)// personB（call 改变返回函数的 this）
personA.show3.call(personB)()// window（返回函数调用时 this = window）

personA.show4()()            // personA（返回的箭头函数继承 show4 的 this）
personA.show4().call(personB)// personA（call 对箭头函数无效，继承 show4 的 this）
personA.show4.call(personB)()// personB（先 call 改变 show4 的 this，箭头函数继承它）
```

**关键点：**
- `show1`：普通函数，`this` 由调用方式决定
- `show2`：箭头函数定义在构造函数中，`this = 实例对象`（继承 `new` 创建的对象）
- `show3`：返回普通函数，该函数独立调用时 `this = window`
- `show4`：返回箭头函数，继承外层函数的 `this`（即实例对象）

---

### 两题的核心区别

| 场景 | 题目一（对象字面量） | 题目二（构造函数） |
|------|------------------|------------------|
| **show2 箭头函数** | `this = window`（全局作用域） | `this = 实例对象`（构造函数作用域） |
| **show4 返回箭头函数** | `this = person1`（继承 show4 的 this） | `this = personA/personB`（继承 show4 的 this） |
| **关键差异** | 对象的 `{}` 不是作用域 | 函数执行创建新的作用域 |

### 学习建议

通过这两题，你需要掌握：
1. ✅ **箭头函数继承的是所在作用域的 `this`**，不是对象
2. ✅ **返回的普通函数是独立的**，调用时 `this` 重新确定
3. ✅ **返回的箭头函数继承外层函数的 `this`**
4. ✅ **`call/apply/bind` 对箭头函数无效**
5. ✅ **对象字面量 vs 构造函数创建的区别**