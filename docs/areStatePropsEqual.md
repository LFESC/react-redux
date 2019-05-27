## [areStatePropsEqual](https://react-redux.js.org/api/connect#arestatepropsequal-next-object-prev-object-boolean)
`areStatePropsEqual`的作用是判断`mapStateToProps`的返回值前后是否相等，其实这个在我们的[`mapStatesEqual`](./mapStatesEqual.md)那篇已经提到了。
### 默认值
如果不传值的话，会默认赋值一个[`shallowEqual`](https://github.com/reduxjs/react-redux/blob/v7.0.3/src/utils/shallowEqual.js)方法，这个方法就是去对传过来的两个值进行浅比较，这个方法写的比较巧妙，具体可以去看源码，我这里就不粘贴了。
```js
{
  pure = true,
  areStatesEqual = strictEqual,
  areOwnPropsEqual = shallowEqual,
  areStatePropsEqual = shallowEqual,
  areMergedPropsEqual = shallowEqual,
  ...extraOptions
} = {}
```
### handleNewState
`areStatePropsEqual`影响的方法只有一个，那就是`handleNewState`，它的作用我们在[`mapStatesEqual`](./mapStatesEqual.md)那篇已经提到了，就是根据新的state计算出新的state props并与其它属性合并之后返回。
```js
function handleNewState() {
  const nextStateProps = mapStateToProps(state, ownProps)
  const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps)
  stateProps = nextStateProps

  if (statePropsChanged)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)

  return mergedProps
}
```