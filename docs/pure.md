# pure
pure的作用是判断被包裹的组件是否是一个[纯组件](https://react-redux.js.org/api/connect#pure-boolean)，如果是一个纯组件，它会尽力复用connect的数据，它在源码里面影响的文件比较多，有`connectAdvanced.js,mergeProps.js,selectoFactory.js`。
## 默认值
pure默认值是true
```js
{
  pure = true,
  areStatesEqual = strictEqual,
  areOwnPropsEqual = shallowEqual,
  areStatePropsEqual = shallowEqual,
  areMergedPropsEqual = shallowEqual,
  ...extraOptions
} = {}

--------- from connect.js
```
## usePureOnlyMemo
prue的值决定了connectAdvanced.js文件里面的`usePureOnlyMemo`变量的值，如果pure为ture则返回[useMemo](https://reactjs.org/docs/hooks-reference.html#usememo)，否则返回一个简单的包装器仅仅执行传入的callback方法，usePureOnlyMemo用于生成传给connect组件的props（actualChildProps），所以如果pure为ture就会尽可能的复用props。
```js
// If we aren't running in "pure" mode, we don't want to memoize values.
// To avoid conditionally calling hooks, we fall back to a tiny wrapper
// that just executes the given callback immediately.
// 如果我们不是在“pure”模式下运行，我们就不需要记忆值。
// 为了避免有条件地调用钩子，我们回到一个很小的包装器
// 直接执行给定的回调。
const usePureOnlyMemo = pure ? useMemo : callback => callback()

--------- from connectAdvanced.js
```
```js
const actualChildProps = usePureOnlyMemo(() => {
// Tricky logic here:
// - This render may have been triggered by a Redux store update that produced new child props
// - However, we may have gotten new wrapper props after that
// If we have new child props, and the same wrapper props, we know we should use the new child props as-is.
// But, if we have new wrapper props, those might change the child props, so we have to recalculate things.
// So, we'll use the child props from store update only if the wrapper props are the same as last time.
// 棘手的逻辑:
// -这个渲染可能是由产生新的子props的Redux store更新触发的
// -但是，在那之后我们可能得到了新的包装props
// 如果我们有新的子props和相同的包装props，我们知道应该按原样使用新的子props。
// 但是，如果我们有新的包装器props，这些可能会改变子props，所以我们必须重新计算。
// 因此，只有包装器props与上次相同时，我们才使用store update中的子props。
if (
  childPropsFromStoreUpdate.current &&
  wrapperProps === lastWrapperProps.current
) {
  return childPropsFromStoreUpdate.current
}

// TODO We're reading the store directly in render() here. Bad idea?
// This will likely cause Bad Things (TM) to happen in Concurrent Mode.
// Note that we do this because on renders _not_ caused by store updates, we need the latest store state
// to determine what the child props should be.
// TODO 我们直接在render()中读取存储。坏主意?
// 这可能会导致在并发模式下发生不好的事情(TM)。
// 注意，我们这样做是因为在呈现由存储更新引起的_not_时，我们需要最新的存储状态
// 去确定子props应该是什么。
return childPropsSelector(store.getState(), wrapperProps)
}, [store, previousStateUpdateResult, wrapperProps])

----------- from connectAdvanced.js
```
## Connect
pure还会影响connect返回的组件，如果pure为true则会通过React.memo进行优化，只有外部props变化时才会重新render组件。
```js
// If we're in "pure" mode, ensure our wrapper component only re-renders when incoming props have changed.
// 如果我们处于“pure”模式，确保包装器组件只在传入的props发生更改时重新呈现。
const Connect = pure ? React.memo(ConnectFunction) : ConnectFunction

----------- from connectAdvanced.js
```
## mergePropsProxy
pure还会影响mergePropsProxy，当pure为true时会判断前两次mergedProps，如果相同就会复用。
```js
return function mergePropsProxy(stateProps, dispatchProps, ownProps) {
const nextMergedProps = mergeProps(stateProps, dispatchProps, ownProps)

if (hasRunOnce) {
  if (!pure || !areMergedPropsEqual(nextMergedProps, mergedProps))
    mergedProps = nextMergedProps
} else {
  hasRunOnce = true
  mergedProps = nextMergedProps

  if (process.env.NODE_ENV !== 'production')
    verifyPlainObject(mergedProps, displayName, 'mergeProps')
}

return mergedProps
}

------------- from mergeProps.js
```
## selectorFactory
pure还会影响selectorFactory，selectorFactory的基本作用是合并`mapStateToProps`和`mapDispatchToProps`所返回的值然后返回，如果pure为true则会用`pureFinalPropsSelectorFactory`它会判断state和props的变化，如果没有改变就复用之前的数据。
>注：`pureFinalPropsSelectorFactory`方法太大了，我就不粘过来了，可以去selectorFactory.js里面去查看；如果pure为false则会用`impureFinalPropsSelectorFactory`它就是简单的合并`mapStateToProps`和`mapDispatchToProps`所返回的值以及`ownProps`。
另外我还会在[connectAdvanced](./connectAdvanced.md)里面进一步讲解这个方法。
```js
const selectorFactory = options.pure
? pureFinalPropsSelectorFactory
: impureFinalPropsSelectorFactory

-------- from selectorFactory.js
```