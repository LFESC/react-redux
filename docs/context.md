# context
## 默认值
如果不传context会使用内部创建的context对象，context的值就是store和内部创建的subscription对象，关于这部门可以去看[Provider](./provider.md)部分的内容。
```js
// the context consumer to use
// 要使用的context对象
context = ReactReduxContext,

--------- from connectAdvanced.js
```
```js
import React from 'react'

export const ReactReduxContext = React.createContext(null)

export default ReactReduxContext

--------- from Context.js
```
## Context
随后把context赋值为`Context`
```js
const Context = context
```
## ContextToUse
用户可以通过props给connect的对象传递context对象，所以需要做一个判断到底使用哪个context。
```js
const ContextToUse = useMemo(() => {
// Users may optionally pass in a custom context instance to use instead of our ReactReduxContext.
// Memoize the check that determines which context instance we should use.
// 用户可以选择传递自定义上下文实例来代替ReactReduxContext。
// 记住决定我们应该使用哪个上下文实例的检查。
return propsContext &&
  propsContext.Consumer &&
  isContextConsumer(<propsContext.Consumer />)
  ? propsContext
  : Context
}, [propsContext, Context])

--------- from connectAdvanced.js
```
### renderedChild
如果shouldHandleStateChanges为真（传递了mapStateToProps），表示需要监听state的变化，渲染`ContextToUse.Provider`包裹的WrappedComponent
```js
// If React sees the exact same element reference as last time, it bails out of re-rendering
// that child, same as if it was wrapped in React.memo() or returned false from shouldComponentUpdate.
// 如果React看到与上次完全相同的元素引用，它将停止重新呈现
// 这个子元素，就像它被包装在response.memo()中一样，或者从shouldComponentUpdate返回false。
const renderedChild = useMemo(() => {
  if (shouldHandleStateChanges) {
    // If this component is subscribed to store updates, we need to pass its own
    // subscription instance down to our descendants. That means rendering the same
    // Context instance, and putting a different value into the context.
    // 如果这个组件订阅了存储更新，我们需要传递它自己的更新
    // 订阅实例。这意味着渲染相同
    // 上下文实例，并将不同的值放入上下文。
    return (
      <ContextToUse.Provider value={overriddenContextValue}>
        {renderedWrappedComponent}
      </ContextToUse.Provider>
    )
  }

  return renderedWrappedComponent
}, [ContextToUse, renderedWrappedComponent, overriddenContextValue])

--------- from connectAdvanced.js
```