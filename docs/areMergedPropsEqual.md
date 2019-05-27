# areMergedPropsEqual
判断前后两次合并的属性对象是否相等
## 默认值
如果不传值的话，会默认赋值一个[`shallowEqual`](https://github.com/reduxjs/react-redux/blob/v7.0.3/src/utils/shallowEqual.js)方法，这个方法就是去对传过来的两个值进行浅比较，这个方法写的比较巧妙，具体可以去看源码，我这里就不粘贴了。
```js
{
  pure = true,
  areStatesEqual = strictEqual,
  areOwnPropsEqual = shallowEqual,
  areStatePropsEqual = shallowEqual,
  areMergedPropsEqual = shallowEqual,
  ...extraOptions
} = {}

-------- from connect.js
```
## wrapMergePropsFunc
这个方法只会在`wrapMergePropsFunc`里面去调用，这个方法用于处理`mergeProps`，这里的作用就是判断前后合并的结果是否相同，如果不相同就将新的值返回出去。
```js
if (hasRunOnce) {
  if (!pure || !areMergedPropsEqual(nextMergedProps, mergedProps))
    mergedProps = nextMergedProps
} else {
  hasRunOnce = true
  mergedProps = nextMergedProps

  if (process.env.NODE_ENV !== 'production')
    verifyPlainObject(mergedProps, displayName, 'mergeProps')
}

--------- from mergeProps.js
```