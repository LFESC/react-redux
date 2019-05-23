# mergeProps
## match
首先调用match方法，这个方法的逻辑和mapStateToProps是一样的，会根据mergePropsFactories
会返回一个方法。
```js
// 如果mergeProps是一个function，则返回一个function initMergePropsProxy
// 如果mergeProps省略，则返回一个function defaultMergeProps
const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')
-------- from connect.js
```
## mergePropsFactories
mergePropsFactories是一个数组，里面有两个方法，一个处理mergeProps是function的情况，一个处理mergeProps没传的情况。
```js
export function whenMergePropsIsFunction(mergeProps) {
  return typeof mergeProps === 'function'
    ? wrapMergePropsFunc(mergeProps)
    : undefined
}

export function whenMergePropsIsOmitted(mergeProps) {
  return !mergeProps ? () => defaultMergeProps : undefined
}

export default [whenMergePropsIsFunction, whenMergePropsIsOmitted]

---------- from mergeProps.js
```
## mergeProps为function
mergeProps为function的时候会调用wrapMergePropsFunc方法，这个方法会返回一个方法initMergePropsProxy，这个方法又会返回一个方法mergePropsProxy，主要的逻辑在这个方法里面，这个方法接受stateProps和dispatchProps，并传递给mergeProps，最终返回mergeProps执行的结果。
这里需要注意一下当第二次调用mergePropsProxy的时候会做一个判断`!pure || !areMergedPropsEqual(nextMergedProps, mergedProps)`这段代码很好理解，就是判断如果pure参数是true或者两次mergeProps返回的结果相同就返回上次执行的结果，相当于一个优化，这个方法会缓存上一次执行的结果。
```js
export function wrapMergePropsFunc(mergeProps) {
  return function initMergePropsProxy(
    dispatch,
    { displayName, pure, areMergedPropsEqual }
  ) {
    let hasRunOnce = false
    let mergedProps

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
  }
}

---------- from mergeProps.js
```
## mergeProps未传值
当mergeProps未传值的时候会返回一个默认的mergeProps方法，这个方法内部就是一个简单的合并处理。
```js
export function defaultMergeProps(stateProps, dispatchProps, ownProps) {
  return { ...ownProps, ...stateProps, ...dispatchProps }
}
```