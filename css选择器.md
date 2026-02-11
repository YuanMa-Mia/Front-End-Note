<!--
 * @Author: mayuan17 mayuan17@meituan.com
 * @Date: 2026-02-08 18:15:30
 * @LastEditors: mayuan17 mayuan17@meituan.com
 * @LastEditTime: 2026-02-08 18:35:40
 * @FilePath: /Front-End-Note/css选择器.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
# CSS 选择器优先级

## 概述

CSS选择器优先级决定了当多个规则应用于同一元素时，哪个样式生效。遵循 **!important > 行内样式 > ID选择器 > 类/属性/伪类 > 标签/伪元素 > 通配符** 的顺序。

优先级由 `(A, B, C, D)` 权重计算，依次比较A、B、C、D数值，数值大则优先。

## CSS 优先级等级排序

从最高到最低排序如下：

1. **!important**：拥有最高权重，直接覆盖所有样式
2. **行内样式** (`style="..."`)：权重值最高（约1000）
3. **ID 选择器** (`#id`)：权重为 100
4. **类、伪类、属性选择器** (`.class`, `:hover`, `[type]`)：权重为 10
5. **标签、伪元素选择器** (`div`, `::before`)：权重为 1
6. **通配符、关系选择符** (`*`, `+`, `>`, `~`)：权重为 0

## 选择器示例详解

### 伪类选择器

伪类选择器用于选择元素的特定状态，使用单冒号 `:` 表示。

**常见伪类选择器：**

```css
/* 链接相关伪类 */
a:link { color: blue; }           /* 未访问的链接 */
a:visited { color: purple; }      /* 已访问的链接 */
a:hover { color: red; }           /* 鼠标悬停 */
a:active { color: orange; }       /* 鼠标点击时 */

/* 表单相关伪类 */
input:focus { border-color: blue; }      /* 获得焦点 */
input:disabled { opacity: 0.5; }         /* 禁用状态 */
input:checked { background: green; }     /* 选中状态（单选框/复选框） */
input:required { border-color: red; }    /* 必填字段 */
input:optional { border-color: gray; }   /* 可选字段 */
input:valid { border-color: green; }     /* 验证通过 */
input:invalid { border-color: red; }     /* 验证失败 */

/* 结构性伪类 */
li:first-child { font-weight: bold; }    /* 第一个子元素 */
li:last-child { margin-bottom: 0; }      /* 最后一个子元素 */
li:nth-child(2) { color: red; }          /* 第2个子元素 */
li:nth-child(odd) { background: #f0f0f0; }   /* 奇数项 */
li:nth-child(even) { background: white; }    /* 偶数项 */
li:nth-child(3n) { color: blue; }        /* 每3个元素 */
p:first-of-type { margin-top: 0; }       /* 同类型的第一个 */
p:last-of-type { margin-bottom: 0; }     /* 同类型的最后一个 */
div:only-child { width: 100%; }          /* 唯一子元素 */
p:empty { display: none; }               /* 没有子元素的元素 */

/* 否定伪类 */
li:not(.active) { opacity: 0.5; }        /* 不包含 .active 类的 li */
input:not([type="submit"]) { width: 100%; }  /* 不是提交按钮的 input */

/* 其他常用伪类 */
div:target { background: yellow; }       /* URL 锚点目标元素 */
*:root { --main-color: blue; }          /* 根元素（:root 等同于 html） */
```

### 属性选择器

属性选择器用于选择具有特定属性或属性值的元素，使用方括号 `[]` 表示。

**常见属性选择器：**

```css
/* [attr] - 存在属性 */
[disabled] { cursor: not-allowed; }      /* 所有带 disabled 属性的元素 */
[data-id] { border: 1px solid red; }     /* 所有带 data-id 属性的元素 */

/* [attr=value] - 精确匹配 */
[type="text"] { border: 1px solid gray; }    /* type 属性值为 "text" */
[class="btn"] { padding: 10px; }             /* class 属性值恰好是 "btn" */

/* [attr~=value] - 包含完整单词 */
[class~="btn"] { padding: 10px; }            /* class 包含 "btn" 单词 */
/* 匹配：class="btn primary" 或 class="primary btn" */
/* 不匹配：class="btn-primary" */

/* [attr|=value] - 以指定值开头（后跟连字符） */
[lang|="zh"] { font-family: "SimSun"; }      /* lang="zh" 或 lang="zh-CN" */

/* [attr^=value] - 以指定值开头 */
[href^="https"] { color: green; }            /* href 以 "https" 开头 */
[class^="btn-"] { border-radius: 4px; }      /* class 以 "btn-" 开头 */
[src^="data:image"] { display: block; }      /* data URI 图片 */

/* [attr$=value] - 以指定值结尾 */
[href$=".pdf"] { background: url(pdf-icon.png); }  /* PDF 链接 */
[src$=".jpg"] { border: 1px solid gray; }          /* JPG 图片 */
[href$=".com"] { color: blue; }                    /* .com 域名 */

/* [attr*=value] - 包含指定值 */
[href*="example"] { text-decoration: underline; }  /* href 包含 "example" */
[class*="icon"] { font-size: 20px; }               /* class 包含 "icon" */
[title*="提示"] { cursor: help; }                  /* title 包含 "提示" */

/* 大小写不敏感匹配（i 标志） */
[type="text" i] { border: 1px solid gray; }        /* 匹配 text、TEXT、Text 等 */
[href$=".PDF" i] { background: url(pdf-icon.png); } /* 匹配 .pdf 或 .PDF */

/* 组合使用 */
input[type="text"][required] { border: 2px solid red; }  /* 必填文本框 */
a[href^="https"][target="_blank"] { padding-right: 15px; } /* 新窗口的 https 链接 */
img[alt][src$=".png"] { border: 1px solid gray; }  /* 有 alt 的 PNG 图片 */
```

## 特殊规则

- **继承样式**：继承来的属性权重为 0，即使是子元素直接设置了通配符样式，也会覆盖继承样式
- **!important**：如果两个元素都使用了 `!important`，则比较正常优先级
- **就近原则**：如果优先级完全相同，则后定义的样式会覆盖先定义的样式