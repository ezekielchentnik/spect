// FIXME: replace with primitive-pool WeakMap
// this cache is for faster fetching static targets' aspects
export const cache = new Map

// target is wrapper over collection of items
export default function $(arg) {
  if (arg instanceof Node) {
    if (!cache.has(arg)) cache.set(arg, new Spect(arg))
    return cache.get(arg)
  }

  // selector can select more nodes than before, so
  if (!cache.has(arg)) cache.set(arg, new Spect())

  let spectable = cache.get(arg)

  // selector can query new els set, so we update the list
  if (typeof arg === 'string') {
    arg = document.querySelectorAll(arg)
  }

  // nodelist/array could have changed, so make sure new els are in the list
  // FIXME: that can be done faster
  spectable.set(...arg)

  return spectable
}

// FIXME: enable negative indexes via array
class Spect extends Array {
  constructor (...args) {
    super()
    this.set(...args)
  }
  set(...args) {
    this.length = 0
    this.push(...args)
  }
}

export const fn = $.fn = Spect.prototype
