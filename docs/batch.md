# batch
batch的作用是将若干更新成批的处理，这样只会多个更新只会调用一次render
## 参数
- function
## 使用方式
```js
import { batch } from "react-redux";

function myThunk() {
  return (dispatch, getState) => {
      // should only result in one combined re-render, not two
      batch(() => {
          dispatch(increment());
          dispatch(increment());
      })
  }
}
```
## 解析
就是将`react-dom`的`unstable_batchedUpdates`方法拿过来改了一个名字而已。
```js
/* eslint-disable import/no-unresolved */
export { unstable_batchedUpdates } from 'react-dom'

----------- from reactBatchedUpdates.js
```
```js
import { unstable_batchedUpdates as batch } from './utils/reactBatchedUpdates'

----------- from index.js
```