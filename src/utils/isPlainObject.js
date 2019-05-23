/**
 * @param {any} obj The object to inspect. 
 * @param {any} obj 要检查的对象 
 * @returns {boolean} True if the argument appears to be a plain object.
 * @returns {boolean} 如果参数是一个纯对象则返回true
 */
export default function isPlainObject(obj) {
  if (typeof obj !== 'object' || obj === null) return false

  let proto = Object.getPrototypeOf(obj)
  if (proto === null) return true

  let baseProto = proto
  while (Object.getPrototypeOf(baseProto) !== null) {
    baseProto = Object.getPrototypeOf(baseProto)
  }

  return proto === baseProto
}
