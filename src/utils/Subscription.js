import { getBatch } from './batch'

// encapsulates the subscription logic for connecting a component to the redux store, as
// well as nesting subscriptions of descendant components, so that we can ensure the
// ancestor components re-render before descendants
// 封装订阅逻辑，用于将组件连接到redux存储
// 以及嵌套订阅的后代组件，以便我们可以确保
// 祖先组件在后代组件之前重新呈现

const CLEARED = null
const nullListeners = { notify() {} }

// 创建了一个监听器的集合
function createListenerCollection() {
  const batch = getBatch()
  // the current/next pattern is copied from redux's createStore code.
  // TODO: refactor+expose that code to be reusable here?
  // current/next模式是从redux的createStore代码中复制的。
  // TODO:重构+公开代码以便在这里重用?
  // TODO: 不是很明白为啥要设置两个变量保存listeners
  let current = []
  let next = []

  return {
    clear() {
      next = CLEARED
      current = CLEARED
    },

    // 执行所有的listeners
    notify() {
      const listeners = (current = next)
      batch(() => {
        for (let i = 0; i < listeners.length; i++) {
          listeners[i]()
        }
      })
    },

    get() {
      return next
    },

    // 类似redux的subscribe，添加listener，并返回卸载方法
    subscribe(listener) {
      let isSubscribed = true
      if (next === current) next = current.slice()
      next.push(listener)

      return function unsubscribe() {
        if (!isSubscribed || current === CLEARED) return
        isSubscribed = false

        if (next === current) next = current.slice()
        next.splice(next.indexOf(listener), 1)
      }
    }
  }
}

export default class Subscription {
  constructor(store, parentSub) {
    this.store = store
    this.parentSub = parentSub
    this.unsubscribe = null
    this.listeners = nullListeners

    this.handleChangeWrapper = this.handleChangeWrapper.bind(this)
  }

  // 添加嵌套的listener
  // 并且返回卸载方法
  addNestedSub(listener) {
    this.trySubscribe()
    return this.listeners.subscribe(listener)
  }

  // 执行所有listeners
  notifyNestedSubs() {
    this.listeners.notify()
  }

  // 当store变化时触发的方法
  handleChangeWrapper() {
    if (this.onStateChange) {
      this.onStateChange()
    }
  }

  // 判断是否启动了订阅
  isSubscribed() {
    return Boolean(this.unsubscribe)
  }

  // 初始化的功能
  trySubscribe() {
    if (!this.unsubscribe) {
      this.unsubscribe = this.parentSub
        ? this.parentSub.addNestedSub(this.handleChangeWrapper)
        : this.store.subscribe(this.handleChangeWrapper) // 给store上面添加了一个观察者，当store改变会执行所有listeners

      this.listeners = createListenerCollection()
    }
  }

  // 卸载监听器，包含两个
  // 1. 对redux store的监听
  // 2. 内部添加的listeners
  tryUnsubscribe() {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
      this.listeners.clear()
      this.listeners = nullListeners
    }
  }
}
