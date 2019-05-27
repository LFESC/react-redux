# forwardRef
forwardRef用于给connect包裹的组件添加一个ref，这样外部就可以通过ref操控包裹的组件了。
## 默认值
```js
// use React's forwardRef to expose a ref of the wrapped component
// 使用React的forwardRef公开包装组件的ref
forwardRef = false,
```
## wrapWithConnect
如果`forwardRef`为真，则通过将组件包裹在`React.forwardRef`方法里，并将ref传递给包裹组件的`forwardedRef`属性，关于这块可以去看[官网](https://reactjs.org/docs/forwarding-refs.html#forwarding-refs-in-higher-order-components)的用法。
```js
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

---------- from connectAdvanced.js
```