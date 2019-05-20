import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { ReactReduxContext } from './Context'
import Subscription from '../utils/Subscription'

class Provider extends Component {
  constructor(props) {
    super(props)

    const { store } = props

    this.notifySubscribers = this.notifySubscribers.bind(this)
    const subscription = new Subscription(store)
    subscription.onStateChange = this.notifySubscribers

    this.state = {
      store,
      subscription
    }

    this.previousState = store.getState()
  }

  componentDidMount() {
    // TODO: 没搞懂哪里会用到_isMounted
    this._isMounted = true

    // 初始化subscription，具体见trySubscribe方法
    this.state.subscription.trySubscribe()

    // 如果构造函数里面初始state和componentDidMount里面的state不一致则触发所有listeners
    // 暂时没想到为啥会不一样，可能是为了容错吧
    if (this.previousState !== this.props.store.getState()) {
      this.state.subscription.notifyNestedSubs()
    }
  }

  componentWillUnmount() {
    // TODO: 没搞懂哪里会设置unsubscribe
    if (this.unsubscribe) this.unsubscribe()

    // 卸载监听器
    this.state.subscription.tryUnsubscribe()

    this._isMounted = false
  }

  componentDidUpdate(prevProps) {
    // 如果Provider发生了更新并且是由于store发生变化（这种情况应该不常见吧？）
    // 卸载监听器
    // 再根据新的store创建订阅者
    // 后三行感觉和构造函数里面是重复的，可以提取成公共方法
    if (this.props.store !== prevProps.store) {
      this.state.subscription.tryUnsubscribe()
      const subscription = new Subscription(this.props.store)
      subscription.onStateChange = this.notifySubscribers
      this.setState({ store: this.props.store, subscription })
    }
  }

  // 触发订阅者里面的监听器
  // 触发条件是store执行action修改了state后
  notifySubscribers() {
    this.state.subscription.notifyNestedSubs()
  }

  render() {
    // 如果不传自定义的context就用默认的
    const Context = this.props.context || ReactReduxContext

    return (
      <Context.Provider value={this.state}>
        {this.props.children}
      </Context.Provider>
    )
  }
}

Provider.propTypes = {
  store: PropTypes.shape({
    subscribe: PropTypes.func.isRequired,
    dispatch: PropTypes.func.isRequired,
    getState: PropTypes.func.isRequired
  }),
  context: PropTypes.object,
  children: PropTypes.any
}

export default Provider
