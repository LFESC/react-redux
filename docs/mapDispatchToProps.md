# mapDispatchToProps
## 1. match
和mapStateToProps方法类似，也是首先调用match方法，match方法会对传进来的mapDispatchToPropsFactories进行循环调用。
## 2. mapDispatchToPropsFactories
和mapStateToPropsFactories不同的是，mapDispatchToPropsFactories数组里面有三个方法，除了判断mapDispatchToProps是否是function和是否未传递外还会判断是否是对象。
```js
import { bindActionCreators } from 'redux'
import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

export function whenMapDispatchToPropsIsFunction(mapDispatchToProps) {
  return typeof mapDispatchToProps === 'function'
    ? wrapMapToPropsFunc(mapDispatchToProps, 'mapDispatchToProps')
    : undefined
}

export function whenMapDispatchToPropsIsMissing(mapDispatchToProps) {
  return !mapDispatchToProps
    ? wrapMapToPropsConstant(dispatch => ({ dispatch }))
    : undefined
}

export function whenMapDispatchToPropsIsObject(mapDispatchToProps) {
  return mapDispatchToProps && typeof mapDispatchToProps === 'object'
    ? wrapMapToPropsConstant(dispatch =>
        bindActionCreators(mapDispatchToProps, dispatch)
      )
    : undefined
}

export default [
  whenMapDispatchToPropsIsFunction,
  whenMapDispatchToPropsIsMissing,
  whenMapDispatchToPropsIsObject
]

-------- from mapDispatchToProps.js
```
### 1）mapDispatchToProps是function
mapDispatchToProps为function的时候会调用wrapMapToPropsFunc，这个方法和对mapStateToProps是function所调用的方法是一模一样的，具体做了什么可以去看[mapStateToProps](./mapStateToProps.md)的那篇文章。
### 2）mapDispatchToProps未传值
mapDispatchToProps未传值的时候会调用wrapMapToPropsConstant方法，这个方法也是和mapStateToProps共用的方法，具体做了什么可以去看[mapStateToProps](./mapStateToProps.md)的那篇文章。
### 3）mapDispatchToProps为object的情况
当mapDispatchToProps是一个对象时，同样会调用wrapMapToPropsConstant方法，这个方法是做什么的，我们应该已经清楚了，只不过此时传过去的参数是
```js
dispatch => bindActionCreators (mapDispatchToProps, dispatch)
```
这里`bindActionCreators`就是redux里面的那个方法，它的作用就是将你传过来的`action creator`外面包裹一个方法，并用传过去的`dispatch`去调用。
```js
export function whenMapDispatchToPropsIsObject(mapDispatchToProps) {
  return mapDispatchToProps && typeof mapDispatchToProps === 'object'
    ? wrapMapToPropsConstant(dispatch =>
        bindActionCreators(mapDispatchToProps, dispatch)
      )
    : undefined
}
```