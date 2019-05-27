# areOwnPropsEqual
这个方法是判断前后传递过来的props是否相等。
## 默认值
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

--------- from connect.js
```
## handleSubsequentCallls
`areOwnPropsEqual`会在`handleSubsequentCallls`里面调用，返回一个标识符`propsChanged`，表示前后传过来的props（connect的组件的props）是否改变了。
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

----------- from selectorFactory.js
```
## handleNewPropsAndNewState
`propsChanged`会影响两个方法，第一个是`handleNewPropsAndNewState`，这个方法我们在`areStatesEqual`里面介绍过了，它的作用就是将新的state props和其它数据合并后返回。
```js
function handleNewPropsAndNewState() {
  stateProps = mapStateToProps(state, ownProps)

  if (mapDispatchToProps.dependsOnOwnProps)
    dispatchProps = mapDispatchToProps(dispatch, ownProps)

  mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
  return mergedProps
}

----------- from selectorFactory.js
```
## handleNewProps
`propsChanged`除了会影响`handleNewPropsAndNewState`外还会影响`handleNewProps`方法，这个方法的作用是根据新的props计算出stateProps、dispatchProps并和ownProps合并之后返回。
>`dependsOnOwnProps`：这个属性是判断是否依赖外部传过来的props，它的判断依据是`mapStateToProps`或`mapDispatchToProps`的参数长度，如果参数长度不等于1则表示依赖props。
```js
function handleNewProps() {
  if (mapStateToProps.dependsOnOwnProps)
    stateProps = mapStateToProps(state, ownProps)

  if (mapDispatchToProps.dependsOnOwnProps)
    dispatchProps = mapDispatchToProps(dispatch, ownProps)

  mergedProps = mergeProps(stateProps, dispatchProps, ownProps)
  return mergedProps
}

----------- from selectorFactory.js
```
```js
export function getDependsOnOwnProps(mapToProps) {
  return mapToProps.dependsOnOwnProps !== null &&
    mapToProps.dependsOnOwnProps !== undefined
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1
}

------------ from wrapMapToProps.js
```