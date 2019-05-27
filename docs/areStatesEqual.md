# areStatesEqual
还记得之前我们说过`pure`会影响`selectorFactory`，`selectorFactory`内部会判断state和props的变化，它对state的判断就是通过`areStatesEqual`方法实现的。
## 默认值
如果不传会赋值一个默认的判断函数`strictEqual`，严格判断两个值是否相等。
```js
function strictEqual(a, b) {
  return a === b
}

{
  pure = true,
  areStatesEqual = strictEqual,
  areOwnPropsEqual = shallowEqual,
  areStatePropsEqual = shallowEqual,
  areMergedPropsEqual = shallowEqual,
  ...extraOptions
} = {}  

---------- from connect.js
```
## handleSubsequentCalls
`areStatesEqual`最终会在`handleSubsequentCalls`这个方法里面去调用返回一个标识符`stateChanged`表示state是否变化，这个方法属于`selectoFactory`方法的一部分，最终就是返回`mapStateToProps`和`mapDispatchToProps`的返回值。可以看到`areStatesEqual`的返回值影响了两个方法`handleNewPropsAndNewState`和`handleNewState`。
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
当`stateChanged`和`propsChanged`同时true时，也就是state和props都变化了会调用handleNewPropsAndNewState方法，这个方法会将新的state props和其它数据合并后返回。
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
## handleNewState
当只有`stateChanged`为true时，也就是只有state变化了会调用`handleNewState`方法，这个方法会对新的state props和之前的进行判断，如果不相等就返回新的合并后的数据，否则返回上次合并后的数据。
```js
function handleNewState() {
  const nextStateProps = mapStateToProps(state, ownProps)
  const statePropsChanged = !areStatePropsEqual(nextStateProps, stateProps)
  stateProps = nextStateProps

  if (statePropsChanged)
    mergedProps = mergeProps(stateProps, dispatchProps, ownProps)

  return mergedProps
}

----------- from selectorFactory.js
```