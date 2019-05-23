# mapStateToProps
## match 
首先会把mapStateToProps传给match方法，match方法除了接收mapStateToProps之外还会接收mapStateToPropsFactories方法数组，match方法会遍历数组，将mapStateToProps传给每一个方法去执行，如果result为true就立即结束遍历并返回结果。
```js
// 如果mapStateToProps是一个function,则返回一个function initProxySelector
// 如果mapStateToProps缺失，则返回function initConstantSelector
const initMapStateToProps = match(
  mapStateToProps,
  mapStateToPropsFactories,
  'mapStateToProps'
)
```
```js
// 当factories返回result时就立即返回结果，如果没有任何返回的结果则报错
function match(arg, factories, name) {
  for (let i = factories.length - 1; i >= 0; i--) {
    const result = factories[i](arg)
    if (result) return result
  }

  return (dispatch, options) => {
    throw new Error(
      `Invalid value of type ${typeof arg} for ${name} argument when connecting component ${
        options.wrappedComponentName
      }.`
    )
  }
}
```
## mapStateToPropsFactories
mapStateToPropsFactories返回的数组包含了两个方法，这两个方法一个是处理mapStateToProps是function的时候该如何返回，一个是处理当mapStateToProps没有传递的时候该如何处理。
```js
import { wrapMapToPropsConstant, wrapMapToPropsFunc } from './wrapMapToProps'

export function whenMapStateToPropsIsFunction(mapStateToProps) {
  return typeof mapStateToProps === 'function'
    ? wrapMapToPropsFunc(mapStateToProps, 'mapStateToProps')
    : undefined
}

export function whenMapStateToPropsIsMissing(mapStateToProps) {
  return !mapStateToProps ? wrapMapToPropsConstant(() => ({})) : undefined
}

export default [whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]

-------- from mapStateToProps.js
```
## mapStateToProps是function
先看mapStateToProps是function的情况，这时会调用wrapMapToPropsFunc，这个方法又返回一个方法initProxySelector，这个方法又会返回一个proxy方法。
```js
// dependsOnOwnProps is used by createMapToPropsProxy to determine whether to pass props as args
// to the mapToProps function being wrapped. It is also used by makePurePropsSelector to determine
// whether mapToProps needs to be invoked when props have changed.
// dependsOnOwnProps被createMapToPropsProxy用来决定是否将props作为args传递
// 到正在包装的mapToProps函数。makePurePropsSelector也使用它来确定
// 当props发生变化时，是否需要调用mapToProps。
//
// A length of one signals that mapToProps does not depend on props from the parent component.
// A length of zero is assumed to mean mapToProps is getting args via arguments or ...args and
// therefore not reporting its length accurately..
// 一个标志的长度表示mapToProps不依赖于来自父组件的props。
// 如果长度为0，则认为mapToProps通过参数获取args，或者…参数
// 因此没有准确地报告它的长度…
export function getDependsOnOwnProps(mapToProps) {
  return mapToProps.dependsOnOwnProps !== null &&
    mapToProps.dependsOnOwnProps !== undefined
    ? Boolean(mapToProps.dependsOnOwnProps)
    : mapToProps.length !== 1
}

// Used by whenMapStateToPropsIsFunction and whenMapDispatchToPropsIsFunction,
// this function wraps mapToProps in a proxy function which does several things:
// 由whenMapStateToPropsIsFunction和whenMapDispatchToPropsIsFunction使用，
// 这个函数将mapToProps封装在一个代理函数中，该代理函数做以下几件事:
//
//  * Detects whether the mapToProps function being called depends on props, which
//    is used by selectorFactory to decide if it should reinvoke on props changes.
//  *检测被调用的mapToProps函数是否依赖于props，
//   这被selectorFactory用来决定是否应该在更改props时重新调用。
//
//  * On first call, handles mapToProps if returns another function, and treats that
//    new function as the true mapToProps for subsequent calls.
//  *在第一次调用时，处理mapToProps(如果返回另一个函数)，并把它
//   新函数作为后续调用的真正mapToProps。
//
//  * On first call, verifies the first result is a plain object, in order to warn
//    the developer that their mapToProps function is not returning a valid result.
//  *在第一次调用时，验证第一个结果是一个普通对象，以便发出警告
//   开发人员发现他们的mapToProps函数没有返回有效的结果。
//
//  mapToProps: mapStateToProps or mapDispatchToProps
export function wrapMapToPropsFunc(mapToProps, methodName) {
  return function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      //......
    }

    //......

    return proxy
  }
}
```
proxy方法的作用是根据你传过来的mapStateToProps或mapDispatchToProps的参数的长短判断是否需要ownProps，然后再将stateOrDispatch和ownProps传给你的mapStateToProps货mapDispatchToProps去执行，并返回执行的结果。
>注意：如果你的mapStateToProps或mapDispatchToProps返回的是一个function，react-redux会将它作为真正的mapStateToProps或mapDispatchToProps并执行。

这个proxy还是有点内容的，需要仔细看看。
```js
function initProxySelector(dispatch, { displayName }) {
    const proxy = function mapToPropsProxy(stateOrDispatch, ownProps) {
      return proxy.dependsOnOwnProps
        ? proxy.mapToProps(stateOrDispatch, ownProps)
        : proxy.mapToProps(stateOrDispatch)
    }

    // allow detectFactoryAndVerify to get ownProps
    // 允许 detectFactoryAndVerify 获取 ownProps
    proxy.dependsOnOwnProps = true

    proxy.mapToProps = function detectFactoryAndVerify(
      stateOrDispatch,
      ownProps
    ) {
      // 把用户传进来的mapStateToProps或mapDispatchToProps赋值给proxy.mapToProps
      proxy.mapToProps = mapToProps
      // 判断mapStateToProps或mapDispatchToProps是否依赖ownProps
      proxy.dependsOnOwnProps = getDependsOnOwnProps(mapToProps)
      // 递归调用调用自己，但是此时proxy.mapToProps已经变成了真正传递进来的
      // mapStateToProps或是mapDispatchToProps，此时的返回值就是传进来的这两个方法里面执行返回的结果
      let props = proxy(stateOrDispatch, ownProps)
      
      // 判断返回的结果是否是function，这个比较不常用，因为一般我们都会直接返回一个对象。
      // 但是实际上react-redux也支持返回一个function，如果返回一个function，react-redux
      // 会把它当成真实的mapStateToProps或mapDispatchToProps并继续调用。
      if (typeof props === 'function') {
        proxy.mapToProps = props
        proxy.dependsOnOwnProps = getDependsOnOwnProps(props)
        props = proxy(stateOrDispatch, ownProps)
      }

      if (process.env.NODE_ENV !== 'production')
        verifyPlainObject(props, displayName, methodName)

      return props
    }

    return proxy
  }
```
## mapStateToProps未传值
再看mapStateToProps未传值的情况，从上面第2点可以看到如果mapStateToProps未传值的情况下，会调用wrapMapToPropsConstant方法。这个方法比较简单，就是返回一个initConstantSelector方法，这个方法将外部传进来的getConstant方法执行并返回，从上面第2点可以知道getConstant仅仅是一个匿名函数，返回的结果是空对象。
```js
export function wrapMapToPropsConstant(getConstant) {
  return function initConstantSelector(dispatch, options) {
    const constant = getConstant(dispatch, options)

    function constantSelector() {
      return constant
    }
    constantSelector.dependsOnOwnProps = false
    return constantSelector
  }
}
-------- from wrapMapToProps.js
```