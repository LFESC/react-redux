import connectAdvanced from '../components/connectAdvanced'
import shallowEqual from '../utils/shallowEqual'
import defaultMapDispatchToPropsFactories from './mapDispatchToProps'
import defaultMapStateToPropsFactories from './mapStateToProps'
import defaultMergePropsFactories from './mergeProps'
import defaultSelectorFactory from './selectorFactory'

/*
  connect is a facade over connectAdvanced. It turns its args into a compatible
  selectorFactory, which has the signature:
  connect是connectAdvanced之上的外观。它把它的arg变成了一个兼容的
  selectorFactory，其签名为:

    (dispatch, options) => (nextState, nextOwnProps) => nextFinalProps
  
  connect passes its args to connectAdvanced as options, which will in turn pass them to
  selectorFactory each time a Connect component instance is instantiated or hot reloaded.
  connect将它的args作为选项传递给connectAdvanced, connectAdvanced又将它们传递给selectorFactory
  当它每次实例化或热重载连接组件实例时。

  selectorFactory returns a final props selector from its mapStateToProps,
  mapStateToPropsFactories, mapDispatchToProps, mapDispatchToPropsFactories, mergeProps,
  mergePropsFactories, and pure args.
  selectorFactory从它的mapStateToProps，mapStateToPropsFactories, mapDispatchToProps, mapDispatchToPropsFactories, mergeProps，
  mergePropsFactories和纯pure args，返回一个最终的props selector，
  
  The resulting final props selector is called by the Connect component instance whenever
  it receives new props or store state.
  无论何时，Connect组件实例都会调用最终的props selector当
  它接收新的props或store state。
 */

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

function strictEqual(a, b) {
  return a === b
}

// createConnect with default args builds the 'official' connect behavior. Calling it with
// different options opens up some testing and extensibility scenarios
// 使用默认args创建createConnect构建“正式”连接行为。调用它
// 不同的选项打开了一些测试和扩展场景
export function createConnect({
  connectHOC = connectAdvanced,
  mapStateToPropsFactories = defaultMapStateToPropsFactories,
  mapDispatchToPropsFactories = defaultMapDispatchToPropsFactories,
  mergePropsFactories = defaultMergePropsFactories,
  selectorFactory = defaultSelectorFactory
} = {}) {
  // 这个就是最终暴露出去的接口
  return function connect(
    mapStateToProps,
    mapDispatchToProps,
    mergeProps,
    {
      pure = true,
      areStatesEqual = strictEqual,
      areOwnPropsEqual = shallowEqual,
      areStatePropsEqual = shallowEqual,
      areMergedPropsEqual = shallowEqual,
      ...extraOptions
    } = {}
  ) {
    // 如果mapStateToProps是一个function,则返回一个function initProxySelector
    // 如果mapStateToProps缺失，则返回function initConstantSelector
    const initMapStateToProps = match(
      mapStateToProps,
      mapStateToPropsFactories,
      'mapStateToProps'
    )
    // 如果mapDispatchToProps是一个function,则返回一个function initProxySelector
    // 如果mapDispatchToProps缺失，则返回function initConstantSelector
    // 如果mapDispatchToProps是object，则返回function initConstantSelector
    const initMapDispatchToProps = match(
      mapDispatchToProps,
      mapDispatchToPropsFactories,
      'mapDispatchToProps'
    )
    // 如果mergeProps是一个function，则返回一个function initMergePropsProxy
    // 如果mergeProps省略，则返回一个function defaultMergeProps
    const initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps')

    return connectHOC(selectorFactory, {
      // used in error messages
      // 用于显示错误信息
      methodName: 'connect',

      // used to compute Connect's displayName from the wrapped component's displayName.
      // 用于从包裹的组件的displayName计算Connect的displayName
      getDisplayName: name => `Connect(${name})`,

      // if mapStateToProps is falsy, the Connect component doesn't subscribe to store state changes
      // 如果mapStateToProps是错误的，Connect组件就不监听store state的变化
      shouldHandleStateChanges: Boolean(mapStateToProps),

      // passed through to selectorFactory
      // 传递到selectorFactory的参数
      initMapStateToProps,
      initMapDispatchToProps,
      initMergeProps,
      pure,
      areStatesEqual,
      areOwnPropsEqual,
      areStatePropsEqual,
      areMergedPropsEqual,

      // any extra options args can override defaults of connect or connectAdvanced
      // 任何额外的配置参数可以覆盖connect或者connectAdvanced的默认参数
      ...extraOptions
    })
  }
}

export default createConnect()
