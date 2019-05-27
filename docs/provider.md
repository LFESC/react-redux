# Provider
## 参数
- store
- children
- context
## 使用方式
```js
import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import { App } from './App'
import createStore from './createReduxStore'

const store = createStore()

ReactDOM.render(
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
)
```
## 解析
### 返回值
```js
return (
  <Context.Provider value={this.state}>
    {this.props.children}
  </Context.Provider>
)
```
### 参数
#### store
store会传入组件的state里面并传给Context.Provider
```js
this.state = {
  store,
  subscription
}
```
#### children 
children就是传给Context.Provider的children
#### context 
context是可以自定义的context，如果不传即用内部创建的context
```js
// 如果不传自定义的context就用默认的
const Context = this.props.context || ReactReduxContext
```
### Subscription
Subscription对象的作用是监听store的变化并执行对应的listeners
```js
// 初始化的功能
trySubscribe() {
  if (!this.unsubscribe) {
    this.unsubscribe = this.parentSub
      ? this.parentSub.addNestedSub(this.handleChangeWrapper)
      : this.store.subscribe(this.handleChangeWrapper) // 给store上面添加了一个观察者，当store改变会执行所有listeners

    this.listeners = createListenerCollection()
  }
}
``` 