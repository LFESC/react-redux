# connectAdvanced
这个方法可以说是connect最核心的实现方法了，所以你要了解connect你必须要了解这个方法，之前我们分别介绍了connect的返回值和各个参数，react-redux暴露出这个方法，让你可以通过传递自定义的参数去覆盖一些默认的功能。
## 参数
- selectorFactory
- connectOptions
## 使用方式
```js
import * as actionCreators from './actionCreators'
import { bindActionCreators } from 'redux'

function selectorFactory(dispatch) {
  let ownProps = {}
  let result = {}

  const actions = bindActionCreators(actionCreators, dispatch)
  const addTodo = text => actions.addTodo(ownProps.userId, text)

  return (nextState, nextOwnProps) => {
    const todos = nextState.todos[nextOwnProps.userId]
    const nextResult = { ...nextOwnProps, todos, addTodo }
    ownProps = nextOwnProps
    if (!shallowEqual(result, nextResult)) result = nextResult
    return result
  }
}
export default connectAdvanced(selectorFactory)(TodoApp)
```
## 解析
connectAdvanced接受两个参数
### selectorFactory
第一个参数是一个工厂函数（高阶函数），它会在组件实例化的时候调用，它的返回值是一个`selector`用于根据新的state和props计算传递给包裹的组件的新props，所以它的返回值是一个属性对象。
#### 默认值
值得研究的是`selectorFactory`的默认值，因为我们一般都很少会自定义`connectAdvanced`方法，而且这也是`connect`方法内部运行机制的重要部分。
以下就是`selectorFactory`的默认方法，很容易看懂，很多都是我们之前讲过的内容，比如`initMapStateToProps, initMapDispatchToProps, initMergeProps`这三个方法做了什么可以对应去看之前讲`mapStateToProps, mapDispatchToProps, mergeProps`这三篇文章，最终这个方法会根据`pure`的值返回两种`selector`，ture返回`pureFinalPropsSelectorFactory`，false返回`impureFinalPropsSelectorFactory`。
```js
// If pure is true, the selector returned by selectorFactory will memoize its results,
// allowing connectAdvanced's shouldComponentUpdate to return false if final
// props have not changed. If false, the selector will always return a new
// object and shouldComponentUpdate will always return true.
// 如果pure参数为真，selectorFactory返回的选择器将会记住它的结果，
// 允许connectAdvanced的shouldComponentUpdate返回false如果final
// props没有改变。如果为false，选择器将始终返回一个新
// 对象和shouldComponentUpdate将始终返回true。
export default function finalPropsSelectorFactory(
  dispatch,
  { initMapStateToProps, initMapDispatchToProps, initMergeProps, ...options }
) {
  const mapStateToProps = initMapStateToProps(dispatch, options)
  const mapDispatchToProps = initMapDispatchToProps(dispatch, options)
  const mergeProps = initMergeProps(dispatch, options)

  if (process.env.NODE_ENV !== 'production') {
    // 校验三个方法是否存在，并判断是否有dependsOnOwnProps属性
    verifySubselectors(
      mapStateToProps,
      mapDispatchToProps,
      mergeProps,
      options.displayName
    )
  }

  const selectorFactory = options.pure
    ? pureFinalPropsSelectorFactory
    : impureFinalPropsSelectorFactory

  // pure为true返回 function pureFinalPropsSelector
  // pure为false返回 function impureFinalPropsSelector
  return selectorFactory(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    dispatch,
    options
  )
}

--------- from selectorFactory.js
```
#### pureFinalPropsSelectorFactory
当`pure`为true时返回`pureFinalPropsSelectorFactory`的执行结果。
1.pureFinalPropsSelector
`pureFinalPropsSelectorFactory`又返回一个叫做`pureFinalPropsSelector`的方法，内部根据变量`hasRunAtLeastOnce`返回两个方法，`hasRunAtLeastOnce`见名知意，就是表示是否已经执行过一遍方法了。
```js
return function pureFinalPropsSelector(nextState, nextOwnProps) {
  return hasRunAtLeastOnce
    ? handleSubsequentCalls(nextState, nextOwnProps)
    : handleFirstCall(nextState, nextOwnProps)
}

--------- from selectorFactory.js
```
2.handleFirstCall
如果第一次调用方法，则执行`handleFirstCall`，这个方法不难，主要就是计算出一些初始值，并赋值给变量，这些值的含义你们一看就知道是什么意思了。这些变量属于`pureFinalPropsSelectorFactory`方法内部的变量，所以这块形成了一个闭包，因为之后后续调用还要用到之前计算出来的值。
```js
function handleFirstCall(firstState, firstOwnProps) {
  state = firstState
  ownProps = firstOwnProps
  stateProps = mapStateToProps(state, ownProps)
  dispatchProps = mapDispatchToProps(dispatch, ownProps)
  mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
  hasRunAtLeastOnce = true
  return mergedProps
}

--------- from selectorFactory.js
```
3.handleSubsequentCalls
当第二次调用`pureFinalPropsSelectorFactory`就会执行`handleSubsequentCalls`方法，这个方法是不是很眼熟，因为我们讲`areOwnPropsEqual`和`areStatesEqual`，我们详细讲过这个方法做了什么，这里我就总结一下，这个方法就是去根据`areOwnPropsEqual`和`areStatesEqual`去计算新旧state和props是否变化，如果变化了就分别调用`handleNewPropsAndNewState`，`handleNewProps`或`handleNewState`去计算新的state和props，并返回合并之后的props也就是`mergedProps`，如果没有变化则返回之前计算的`mergedProps`。
```js
function handleSubsequentCalls(nextState, nextOwnProps) {
  const propsChanged = !areOwnPropsEqual(nextOwnProps, ownProps)
  const stateChanged = !areStatesEqual(nextState, state)
  state = nextState
  ownProps = nextOwnProps

  if (propsChanged && stateChanged) return handleNewPropsAndNewState()
  if (propsChanged) return handleNewProps()
  if (stateChanged) return handleNewState()
  return mergedProps
}

--------- from selectorFactory.js
```
#### impureFinalPropsSelectorFactory
如果`pure`为false，则调用impureFinalPropsSelectorFactory方法，这个方法不会去区分第一次调用还是第二次调用，每次都会计算新的state和props，并返回合并之后的props，这也可以看出`pure`参数的作用，就是会去缓存之前计算的值，对新旧的值就行比对，避免不必要的计算和重新渲染以提升性能。
```js
export function impureFinalPropsSelectorFactory(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps,
  dispatch
) {
  return function impureFinalPropsSelector(state, ownProps) {
    return mergeProps(
      mapStateToProps(state, ownProps),
      mapDispatchToProps(dispatch, ownProps),
      ownProps
    )
  }
}

--------- from selectorFactory.js
```
### connectOptions
第二个参数是一些配置项，这些配置项比较简单，直接看我的代码注释就好了。
```js
// options object:
{
  // the func used to compute this HOC's displayName from the wrapped component's displayName.
  // probably overridden by wrapper functions such as connect()
  // 这个方法用于从包装组件的displayName计算这个HOC的displayName。
  // 可能被诸如connect()之类的包装器函数覆盖
  getDisplayName = name => `ConnectAdvanced(${name})`,

  // shown in error messages
  // probably overridden by wrapper functions such as connect()
  // 显示在错误消息中
  // 可能被诸如connect()之类的包装器函数覆盖
  methodName = 'connectAdvanced',

  // REMOVED: if defined, the name of the property passed to the wrapped element indicating the number of
  // calls to render. useful for watching in react devtools for unnecessary re-renders.
  // 移除了: 如果定义了，则将属性的名称传递给包裹的元素表明调用render的次数。
  // 在react devtools中查看不必要的重新呈现非常有用。
  renderCountProp = undefined,

  // determines whether this HOC subscribes to store changes
  // 决定是否HOC监听store的改变
  shouldHandleStateChanges = true,

  // REMOVED: the key of props/context to get the store
  // 移除了: props/context的键去获取store
  storeKey = 'store',

  // REMOVED: expose the wrapped component via refs
  // 移除了: 通过refs公开包装的组件
  withRef = false,

  // use React's forwardRef to expose a ref of the wrapped component
  // 使用React的forwardRef公开包装组件的ref
  forwardRef = false,

  // the context consumer to use
  // 要使用的context对象
  context = ReactReduxContext,

  // additional options are passed through to the selectorFactory
  // 其他选项被传递到selectorFactory
  ...connectOptions
} = {}

---------- from connectAdvanced.js
```
### 返回值
讲完参数之后我们来看一下`connectAdvanced`的返回值，最终会根据`forwardRef`参数的值返回两种组件，这个我们在讲`connect`的options的那篇文章里面也讲到了它的作用，`hoistStatics`是一个第三方库`hoist-non-react-statics`，它的作用是将不是react的特定静态方法从子组件复制到父组件。
```js
return function wrapWithConnect(WrappedComponent) {
  //......
  if (forwardRef) {
      const forwarded = React.forwardRef(function forwardConnectRef(
        props,
        ref
      ) {
        return <Connect {...props} forwardedRef={ref} />
      })

      forwarded.displayName = displayName
      forwarded.WrappedComponent = WrappedComponent
      // Copies non-react specific statics from a child component to a parent component
      // 将不是react的特定静态方法从子组件复制到父组件
      return hoistStatics(forwarded, WrappedComponent)
    }

    return hoistStatics(Connect, WrappedComponent)
}

---------- from connectAdvanced.js
```
### ConnectFunction
我们注意到我们传进来的`WrappedComponent`最终会和一个叫`Connect`的组件合并，那这个`Connect`组件又是什么鬼呢？它其实就是一个函数组件`ConnectFunction`，最终根据`shouldHandleStateChanges`返回两种类型的组件，第一种就是单纯的`WrappedComponent`，第二种是将`WrappedComponent`包裹在`ContextToUse.Provider`内部并返回，这两者都会用useMemo这个React hook优化一下，最后还会用React.memo再包裹一下。
```js
// 一个函数组件
function ConnectFunction(props) {
  //......
  const renderedWrappedComponent = useMemo(
    () => <WrappedComponent {...actualChildProps} ref={forwardedRef} />,
    [forwardedRef, WrappedComponent, actualChildProps]
  )

  // If React sees the exact same element reference as last time, it bails out of re-rendering
  // that child, same as if it was wrapped in React.memo() or returned false from shouldComponentUpdate.
  // 如果React看到与上次完全相同的元素引用，它将停止重新渲染这个子元素，
  // 就像它被包装在React.memo()中一样，或者从shouldComponentUpdate返回false。
  const renderedChild = useMemo(() => {
    if (shouldHandleStateChanges) {
      // If this component is subscribed to store updates, we need to pass its own
      // subscription instance down to our descendants. That means rendering the same
      // Context instance, and putting a different value into the context.
      // 如果这个组件订阅了存储更新，我们需要传递它自己的subscription实例传递到它的后代。
      // 这意味着渲染相同上下文实例，并将不同的值放入上下文。
      return (
        <ContextToUse.Provider value={overriddenContextValue}>
          {renderedWrappedComponent}
        </ContextToUse.Provider>
      )
    }

    return renderedWrappedComponent
  }, [ContextToUse, renderedWrappedComponent, overriddenContextValue])

  return renderedChild
}

// If we're in "pure" mode, ensure our wrapper component only re-renders when incoming props have changed.
// 如果我们处于“pure”模式，确保包装器组件只在传入的props发生更改时重新呈现。
const Connect = pure ? React.memo(ConnectFunction) : ConnectFunction

---------- from connectAdvanced.js
```
### ConnectFunction中的其他逻辑
除了返回值外`ConnectFunction`内部还有很多逻辑，内容比较琐碎，所以我建议你去看我注释过的源码`src/components/connectAdvanced.js`。
这里主要说几点：
1.内部用了很多React hooks，比如用多次用`useMemo`去进行优化。
2.之前说的`selectorFactory`就是在这里调用的，计算出来的props就是`actualChildProps`传递给了`renderedWrappedComponent`。
3.通过`useReducer`实现了当state变化时强制组件更新。
4.通过`useRef`去[保存可变的数据](https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables)，因为函数组件里面没有实例对象，所以它的作用类似于创建了一个实例属性。