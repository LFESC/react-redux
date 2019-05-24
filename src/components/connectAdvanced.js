import hoistStatics from 'hoist-non-react-statics'
import invariant from 'invariant'
import React, {
  useContext,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useReducer
} from 'react'
import { isValidElementType, isContextConsumer } from 'react-is'
import Subscription from '../utils/Subscription'

import { ReactReduxContext } from './Context'

// Define some constant arrays just to avoid re-creating these
// 定义一些常量数组，以避免重新创建它们
const EMPTY_ARRAY = []
const NO_SUBSCRIPTION_ARRAY = [null, null]

const stringifyComponent = Comp => {
  try {
    return JSON.stringify(Comp)
  } catch (err) {
    return String(Comp)
  }
}

function storeStateUpdatesReducer(state, action) {
  const [, updateCount] = state
  return [action.payload, updateCount + 1]
}

const initStateUpdates = () => [null, 0]

// React currently throws a warning when using useLayoutEffect on the server.
// To get around it, we can conditionally useEffect on the server (no-op) and
// useLayoutEffect in the browser. We need useLayoutEffect because we want
// `connect` to perform sync updates to a ref to save the latest props after
// a render is actually committed to the DOM.
// 当在服务器上使用useLayoutEffect时，React当前会抛出一个警告。
// 为了解决这个问题，我们可以有条件地在服务器上使用effect (no-op)
// 在浏览器中使用效果。我们需要有效，因为我们想要
// ' connect '执行对ref的同步更新，以保存最新的props
// 渲染实际上是提交给DOM的。
// isomorphic: 同构
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined'
    ? useLayoutEffect
    : useEffect

export default function connectAdvanced(
  /*
    selectorFactory is a func that is responsible for returning the selector function used to
    compute new props from state, props, and dispatch. For example:
    selectorFactory是一个函数，负责返回用于从state、props和dispatch计算新props。例如:

      export default connectAdvanced((dispatch, options) => (state, props) => ({
        thing: state.things[props.thingId],
        saveThing: fields => dispatch(actionCreators.saveThing(props.thingId, fields)),
      }))(YourComponent)

    Access to dispatch is provided to the factory so selectorFactories can bind actionCreators
    outside of their selector as an optimization. Options passed to connectAdvanced are passed to
    the selectorFactory, along with displayName and WrappedComponent, as the second argument.
    访问dispatch被提供给工厂函数，因此作为一种优化selectorFactories可以在它们的selectors外面绑定actioncreator
    传递给connectAdvanced的选项被传递给选择器工厂函数以及displayName和WrappedComponent作为第二个参数。

    Note that selectorFactory is responsible for all caching/memoization of inbound and outbound
    props. Do not use connectAdvanced directly without memoizing results between calls to your
    selector, otherwise the Connect component will re-render on every state or props change.
    注意，selectorFactory负责入站和出站的所有缓存/记忆props。
    不要在没有缓存selector结果时直接使用connectAdvanced，
    否则connect组件将在每个state或props更改时重新渲染。
  */
  selectorFactory,
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
    // remove: 如果定义了，则将属性的名称传递给包裹的元素表明调用render的次数。
    // 在react devtools中查看不必要的重新呈现非常有用。
    renderCountProp = undefined,

    // determines whether this HOC subscribes to store changes
    // 决定是否HOC监听store的改变
    shouldHandleStateChanges = true,

    // REMOVED: the key of props/context to get the store
    // 删除: props/context的键去获取store
    storeKey = 'store',

    // REMOVED: expose the wrapped component via refs
    // 移除: 通过refs公开包装的组件
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
) {
  invariant(
    renderCountProp === undefined,
    `renderCountProp is removed. render counting is built into the latest React Dev Tools profiling extension`
  )

  invariant(
    !withRef,
    'withRef is removed. To access the wrapped instance, use a ref on the connected component'
  )

  const customStoreWarningMessage =
    'To use a custom Redux store for specific components, create a custom React context with ' +
    "React.createContext(), and pass the context object to React Redux's Provider and specific components" +
    ' like: <Provider context={MyContext}><ConnectedComponent context={MyContext} /></Provider>. ' +
    'You may also pass a {context : MyContext} option to connect'

  invariant(
    storeKey === 'store',
    'storeKey has been removed and does not do anything. ' +
      customStoreWarningMessage
  )

  const Context = context

  return function wrapWithConnect(WrappedComponent) {
    if (process.env.NODE_ENV !== 'production') {
      invariant(
        isValidElementType(WrappedComponent),
        `You must pass a component to the function returned by ` +
          `${methodName}. Instead received ${stringifyComponent(
            WrappedComponent
          )}`
      )
    }

    const wrappedComponentName =
      WrappedComponent.displayName || WrappedComponent.name || 'Component'

    const displayName = getDisplayName(wrappedComponentName)

    const selectorFactoryOptions = {
      ...connectOptions,
      getDisplayName,
      methodName,
      renderCountProp,
      shouldHandleStateChanges,
      storeKey,
      displayName,
      wrappedComponentName,
      WrappedComponent
    }

    const { pure } = connectOptions

    function createChildSelector(store) {
      return selectorFactory(store.dispatch, selectorFactoryOptions)
    }

    // If we aren't running in "pure" mode, we don't want to memoize values.
    // To avoid conditionally calling hooks, we fall back to a tiny wrapper
    // that just executes the given callback immediately.
    // 如果我们不是在“pure”模式下运行，我们就不需要记忆值。
    // 为了避免有条件地调用钩子，我们回到一个很小的包装器
    // 直接执行给定的回调。
    const usePureOnlyMemo = pure ? useMemo : callback => callback()

    // 一个函数组件
    function ConnectFunction(props) {
      // useMemo：https://reactjs.org/docs/hooks-reference.html#usememo
      // 可以缓存结果，当依赖改变时才重新计算新的值
      // 这里是当props变化时才会从返回新的值
      const [propsContext, forwardedRef, wrapperProps] = useMemo(() => {
        // Distinguish between actual "data" props that were passed to the wrapper component,
        // and values needed to control behavior (forwarded refs, alternate context instances).
        // To maintain the wrapperProps object reference, memoize this destructuring.
        // 区分我们传递给包装器组件的实际“数据”以及控制行为所需的值(forwarded refs、备用上下文实例)。
        // 要维护wrapperProps对象引用，请记住这个析构。
        const { forwardedRef, ...wrapperProps } = props
        return [props.context, forwardedRef, wrapperProps]
      }, [props])

      const ContextToUse = useMemo(() => {
        // Users may optionally pass in a custom context instance to use instead of our ReactReduxContext.
        // Memoize the check that determines which context instance we should use.
        // 用户可以选择传递自定义上下文实例来代替ReactReduxContext。
        // 记住决定我们应该使用哪个上下文实例的检查。
        return propsContext &&
          propsContext.Consumer &&
          isContextConsumer(<propsContext.Consumer />)
          ? propsContext
          : Context
      }, [propsContext, Context])

      // Retrieve the store and ancestor subscription via context, if available
      // 如果可用，通过上下文检索store和祖先订阅
      // https://reactjs.org/docs/hooks-reference.html#usecontext
      // 获取context的值，这个值是Provider里面传入的
      const contextValue = useContext(ContextToUse)

      // The store _must_ exist as either a prop or in context
      // store必须在prop存在或在context存在
      const didStoreComeFromProps = Boolean(props.store)
      const didStoreComeFromContext =
        Boolean(contextValue) && Boolean(contextValue.store)

      // 如果store既没有从props获取到又没有从context获取到则报错
      invariant(
        didStoreComeFromProps || didStoreComeFromContext,
        `Could not find "store" in the context of ` +
          `"${displayName}". Either wrap the root component in a <Provider>, ` +
          `or pass a custom React context provider to <Provider> and the corresponding ` +
          `React context consumer to ${displayName} in connect options.`
      )

      const store = props.store || contextValue.store

      // 当pure为ture时返回pureFinalPropsSelector
      // 当pure为false时返回impureFinalPropsSelector
      const childPropsSelector = useMemo(() => {
        // The child props selector needs the store reference as an input.
        // Re-create this selector whenever the store changes.
        // 子道具选择器需要store引用作为输入。
        // 当store发生更改时，重新创建这个选择器。
        return createChildSelector(store)
      }, [store])

      const [subscription, notifyNestedSubs] = useMemo(() => {
        // 如果connect不监听store的改变
        if (!shouldHandleStateChanges) return NO_SUBSCRIPTION_ARRAY

        // This Subscription's source should match where store came from: props vs. context. A component
        // connected to the store via props shouldn't use subscription from context, or vice versa.
        // 这个Subscription源应该与store匹配:props或上下文。一个组件
        // 通过props连接到store不应该使用context里面的subscription，反之亦然。
        const subscription = new Subscription(
          store,
          didStoreComeFromProps ? null : contextValue.subscription
        )

        // `notifyNestedSubs` is duplicated to handle the case where the component is unmounted in
        // the middle of the notification loop, where `subscription` will then be null. This can
        // probably be avoided if Subscription's listeners logic is changed to not call listeners
        // that have been unsubscribed in the  middle of the notification loop.
        // 复制“notifyNestedSubs”来处理组件被在通知循环的中间卸载的情况，“subscription”将为空。这可以
        // 被避免，如果Subscription的侦听器逻辑更改为不调用在通知循环的中间被取消订阅的侦听器。
        const notifyNestedSubs = subscription.notifyNestedSubs.bind(
          subscription
        )

        return [subscription, notifyNestedSubs]
      }, [store, didStoreComeFromProps, contextValue])

      // Determine what {store, subscription} value should be put into nested context, if necessary,
      // and memoize that value to avoid unnecessary context updates.
      // 确定什么{store, subscription}值应该放在嵌套上下文中，如果需要的话，
      // 并记住该值，以避免不必要的上下文更新。
      const overriddenContextValue = useMemo(() => {
        if (didStoreComeFromProps) {
          // This component is directly subscribed to a store from props.
          // We don't want descendants reading from this store - pass down whatever
          // the existing context value is from the nearest connected ancestor.
          // 如果该组件直接从props订阅store。
          // 我们不希望后代从这个store里读——随便什么来自最近的connected祖先现有的context值都传下去
          return contextValue
        }

        // Otherwise, put this component's subscription instance into context, so that
        // connected descendants won't update until after this component is done
        // 否则，将此组件的subscription实例放到上下文中
        // 连接的后代在此组件完成之前不会更新
        return {
          ...contextValue,
          subscription
        }
      }, [didStoreComeFromProps, contextValue, subscription])

      // We need to force this wrapper component to re-render whenever a Redux store update
      // causes a change to the calculated child component props (or we caught an error in mapState)
      // 每当Redux store更新时，我们需要强制这个包装器组件重新渲染
      // 导致对计算出的子组件props的更改(或者我们在mapState中捕获了一个错误)
      const [
        [previousStateUpdateResult],
        forceComponentUpdateDispatch
      ] = useReducer(storeStateUpdatesReducer, EMPTY_ARRAY, initStateUpdates)

      // Propagate any mapState/mapDispatch errors upwards
      // 向上传播任何mapState/mapDispatch错误
      if (previousStateUpdateResult && previousStateUpdateResult.error) {
        throw previousStateUpdateResult.error
      }

      // Set up refs to coordinate values between the subscription effect and the render logic
      // 设置refs来协调订阅效果和呈现逻辑之间的值
      const lastChildProps = useRef()
      const lastWrapperProps = useRef(wrapperProps)
      const childPropsFromStoreUpdate = useRef()
      const renderIsScheduled = useRef(false)

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

      // We need this to execute synchronously every time we re-render. However, React warns
      // about useLayoutEffect in SSR, so we try to detect environment and fall back to
      // just useEffect instead to avoid the warning, since neither will run anyway.
      // 每次重新渲染时都需要同步执行。然而,react会对useLayoutEffect
      // 在SSR中的应用提示警告，我们试着去检测环境，然后返回到
      // 使用effect来避免警告，因为两者都不会运行。
      useIsomorphicLayoutEffect(() => {
        // We want to capture the wrapper props and child props we used for later comparisons
        // 我们希望捕获包装器props和子props，以便以后进行比较
        lastWrapperProps.current = wrapperProps
        lastChildProps.current = actualChildProps
        renderIsScheduled.current = false

        // If the render was from a store update, clear out that reference and cascade the subscriber update
        // 如果渲染来自store更新，清除引用并级联subscriber更新
        if (childPropsFromStoreUpdate.current) {
          childPropsFromStoreUpdate.current = null
          notifyNestedSubs()
        }
      })

      // Our re-subscribe logic only runs when the store/subscription setup changes
      // 我们的重新订阅逻辑只在store/subscription设置更改时运行
      useIsomorphicLayoutEffect(() => {
        // If we're not subscribed to the store, nothing to do here
        // 如果我们没有订阅store，这里就没有什么事可做
        if (!shouldHandleStateChanges) return

        // Capture values for checking if and when this component unmounts
        // 获取值，以检查该组件是否卸载以及何时卸载
        let didUnsubscribe = false
        let lastThrownError = null

        // We'll run this callback every time a store subscription update propagates to this component
        // 每次store订阅更新传播到这个组件时，我们都会运行这个回调
        const checkForUpdates = () => {
          if (didUnsubscribe) {
            // Don't run stale listeners.
            // Redux doesn't guarantee unsubscriptions happen until next dispatch.
            // 不要运行陈旧的侦听器。
            // Redux不保证在下一次分派之前取消订阅。
            return
          }

          const latestStoreState = store.getState()

          let newChildProps, error
          try {
            // Actually run the selector with the most recent store state and wrapper props
            // to determine what the child props should be
            // 使用最新的存储状态和包装器props运行选择器
            // 确定子props应该是什么
            newChildProps = childPropsSelector(
              latestStoreState,
              lastWrapperProps.current
            )
          } catch (e) {
            error = e
            lastThrownError = e
          }

          if (!error) {
            lastThrownError = null
          }

          // If the child props haven't changed, nothing to do here - cascade the subscription update
          // 如果子props没有改变，这里什么也不用做——级联订阅更新
          if (newChildProps === lastChildProps.current) {
            if (!renderIsScheduled.current) {
              notifyNestedSubs()
            }
          } else {
            // Save references to the new child props.  Note that we track the "child props from store update"
            // as a ref instead of a useState/useReducer because we need a way to determine if that value has
            // been processed.  If this went into useState/useReducer, we couldn't clear out the value without
            // forcing another re-render, which we don't want.
            // 保存对新的子props的引用。注意，我们跟踪“store update中的子props”
            // 作为ref而不是useState/useReducer，因为我们需要一种方法来确定该值是否具有
            // 处理。如果这进入useState/useReducer，我们无法清除没有的值
            // 强制重新渲染，这是我们不想要的。
            lastChildProps.current = newChildProps
            childPropsFromStoreUpdate.current = newChildProps
            renderIsScheduled.current = true

            // If the child props _did_ change (or we caught an error), this wrapper component needs to re-render
            // 如果子props _did_ change(或者我们捕获了一个错误)，这个包装器组件需要重新呈现
            forceComponentUpdateDispatch({
              type: 'STORE_UPDATED',
              payload: {
                latestStoreState,
                error
              }
            })
          }
        }

        // Actually subscribe to the nearest connected ancestor (or store)
        // 实际上订阅最近连接的祖先(或存储)
        subscription.onStateChange = checkForUpdates
        subscription.trySubscribe()

        // Pull data from the store after first render in case the store has
        // changed since we began.
        // 在第一次渲染后从存储中拉出数据，以防存储有
        // 自从我们开始改变。
        checkForUpdates()

        const unsubscribeWrapper = () => {
          didUnsubscribe = true
          subscription.tryUnsubscribe()

          if (lastThrownError) {
            // It's possible that we caught an error due to a bad mapState function, but the
            // parent re-rendered without this component and we're about to unmount.
            // This shouldn't happen as long as we do top-down subscriptions correctly, but
            // if we ever do those wrong, this throw will surface the error in our tests.
            // In that case, throw the error from here so it doesn't get lost.
            // 我们可能捕捉到一个错误，因为一个糟糕的mapState函数，但是
            // 父类在没有此组件的情况下重新呈现，我们即将卸载。
            // 只要我们正确地执行自顶向下订阅，就不应该发生这种情况，但是
            // 如果我们做错了，这个抛出将在我们的测试中暴露错误。
            // 在这种情况下，从这里抛出错误，这样它就不会丢失。
            throw lastThrownError
          }
        }

        return unsubscribeWrapper
      }, [store, subscription, childPropsSelector])

      // Now that all that's done, we can finally try to actually render the child component.
      // We memoize the elements for the rendered child component as an optimization.
      // 现在所有这些都完成了，我们终于可以尝试实际呈现子组件了。
      // 我们将呈现的子组件的元素记为优化。
      const renderedWrappedComponent = useMemo(
        () => <WrappedComponent {...actualChildProps} ref={forwardedRef} />,
        [forwardedRef, WrappedComponent, actualChildProps]
      )

      // If React sees the exact same element reference as last time, it bails out of re-rendering
      // that child, same as if it was wrapped in React.memo() or returned false from shouldComponentUpdate.
      // 如果React看到与上次完全相同的元素引用，它将停止重新呈现
      // 这个子元素，就像它被包装在response.memo()中一样，或者从shouldComponentUpdate返回false。
      const renderedChild = useMemo(() => {
        if (shouldHandleStateChanges) {
          // If this component is subscribed to store updates, we need to pass its own
          // subscription instance down to our descendants. That means rendering the same
          // Context instance, and putting a different value into the context.
          // 如果这个组件订阅了存储更新，我们需要传递它自己的更新
          // 订阅实例。这意味着渲染相同
          // 上下文实例，并将不同的值放入上下文。
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

    Connect.WrappedComponent = WrappedComponent
    Connect.displayName = displayName

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
}
