## connect
### 参数
- mapStateToProps?: Function
- mapDispatchToProps?: Function | Object
- mergeProps?: Function
- options?: Object
### 使用方式
```js
import * as todoActionCreators from './todoActionCreators'
import * as counterActionCreators from './counterActionCreators'
import { bindActionCreators } from 'redux'

function mapStateToProps(state) {
  return { todos: state.todos }
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    { ...todoActionCreators, ...counterActionCreators },
    dispatch
  )
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TodoApp)
```
### 解析
#### 返回值 
connect返回一个高阶组件（HOC）
renderedChild就是最后返回的组件
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
```
#### connect将根据shouldHandleStateChanges判断该返回哪种高阶组件
shouldHandleStateChanges的值是判断mapStateToProps是否为真，为真表示传递了mapStateToProps。
```js
// if mapStateToProps is falsy, the Connect component doesn't subscribe to store state changes
// 如果mapStateToProps是错误的，Connect组件就不监听store state的变化
shouldHandleStateChanges: Boolean(mapStateToProps)
```
#### 如果shouldHandleStateChanges为真表示应该监听state的变化，返回一个Context.Provider
```js
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
```
#### 如果shouldHandleStateChanges为假表示不必监听state的变化，直接返回包裹的组件
```js
// Now that all that's done, we can finally try to actually render the child component.
// We memoize the elements for the rendered child component as an optimization.
// 现在所有这些都完成了，我们终于可以尝试实际呈现子组件了。
// 我们将呈现的子组件的元素记为优化。
const renderedWrappedComponent = useMemo(
  () => <WrappedComponent {...actualChildProps} ref={forwardedRef} />,
  [forwardedRef, WrappedComponent, actualChildProps]
)
```