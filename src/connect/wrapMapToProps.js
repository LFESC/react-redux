import verifyPlainObject from '../utils/verifyPlainObject'

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
}
