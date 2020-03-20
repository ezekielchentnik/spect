import _observable from 'symbol-observable'
import c, { observer } from './channel.js'

const depsCache = new WeakMap

export default function v(init, map=v=>v, unmap=v=>v) {
  const channel = c(), { subscribe, observers, push } = channel

  const fn = (...args) => {
    if (!args.length) return get()
    if (observer(...args)) {
      let unsubscribe = subscribe(...args)
      // callback is registered as the last channel subscription, so send it immediately as value
      if ('current' in fn) push(get(), observers.slice(-1))
      return unsubscribe
    }
    return set(...args)
  }
  // we define props on fn - must hide own props
  Object.defineProperties(fn, {
    length: {value: null, writable: true, enumerable: false},
    name: {value: null, writable: true, enumerable: false},
  })
  const value = fn
  // const value = new Proxy(fn, {
  //   get(fn, prop) {
  //     if (channel.canceled) return
  //     if (prop !== 'length' && prop in fn) return fn[prop]
  //     if (init) return init[prop]
  //   },
  //   has(fn, prop) {
  //     if (channel.canceled) return
  //     return prop in fn || (init && prop in init)
  //   },
  //   set(fn, prop, v) {
  //     if (channel.canceled) return true
  //     else init[prop] = v
  //     // need reinit
  //     return true
  //   },
  //   deleteProperty(fn, prop) {
  //     delete init[prop]
  //     // need reinit
  //     return true
  //   }
  // })

  // current is mapped value (map can be heavy to call each get)
  let get = () => fn.current
  let set = () => {}

  fn.valueOf = fn.toString = fn[Symbol.toPrimitive] = get
  fn[_observable] = () => channel
  fn.cancel = channel.cancel
  // observ
  // if (arguments.length) {
    if (typeof init === 'function') {
      set = v => init(unmap(v))
      subscribe(null, null, init(v => push(fn.current = map(v))))
    }
    // Observable (stateless)
    else if (init && init[_observable]) {
      let unsubscribe = init[_observable]().subscribe({next: v => push(fn.current = map(v))})
      unsubscribe = unsubscribe.unsubscribe || unsubscribe
      subscribe(null, null, unsubscribe)
    }
    // group
    // NOTE: array/object may have _observable, which redefines default deps behavior
    else if (Array.isArray(init) || object(init)) {
      let vals = fn.current = new init.constructor
      let deps = []
      deps.channel = c()
      value[Symbol.iterator] = deps[Symbol.iterator].bind(deps)
      if (!depsCache.has(init)) depsCache.set(fn.init = init, value)
      for (let name in init) {
        const dep = init[name], depv = depsCache.has(dep) ? depsCache.get(dep) : v(dep)
        // console.log(dep, depsCache.has(dep), depv)
        depv(v => {
          vals[name] = v
          // avoid self-recursion here
          if (value !== depv) deps.channel(vals)
        })
        deps.push(value[name] = depv)
      }
      deps.channel(v => push(fn.current = map(v)))
      if (Object.keys(vals).length || !Object.keys(init).length) deps.channel(vals)
      set = v => push(fn.current = map(unmap(v)))
      // set = v => deps.push(unmap(v))
      subscribe(null, null, () => {
        deps.map(depv => depv.cancel())
        deps.channel.cancel()
      })
    }
    // input
    else if (input(init)) {
      const el = init

      const iget = el.type === 'checkbox' ? () => el.checked : () => el.value

      const iset = {
        text: value => el.value = (value == null ? '' : value),
        checkbox: value => (el.checked = value, el.value = (value ? 'on' : ''), value ? el.setAttribute('checked', '') : el.removeAttribute('checked')),
        'select-one': value => {
          [...el.options].map(el => el.removeAttribute('selected'))
          el.value = value
          if (el.selectedOptions[0]) el.selectedOptions[0].setAttribute('selected', '')
        }
      }[el.type]

      set = v => (iset(unmap(v)), push(fn.current = iget()))
      const update = e => set(iget())

      // normalize initial value
      update()

      el.addEventListener('change', update)
      el.addEventListener('input', update)
      subscribe(null, null, () => {
        // set = () => {}
        el.removeEventListener('change', update)
        el.removeEventListener('input', update)
      })
    }
    // async iterator (stateful, initial undefined)
    else if (init && (init.next || init[Symbol.asyncIterator])) {
      let stop
      ;(async () => {
        for await (let v of init) {
          if (stop) break
          push(fn.current = map(v))
        }
      })()
      subscribe(null, null, () => stop = true)
    }
    // promise (stateful, initial undefined)
    else if (init && init.then) {
      set = p => (delete fn.current, p.then(v => push(fn.current = map(v))))
      set(init)
    }
    // plain value
    else {
      set = v => push(fn.current = map(unmap(v)))
      if (arguments.length) set(init)
    }
  // }

  // cancel subscriptions, dispose
  subscribe(null, null, () => {
    // get = set = () => {throw Error('closed')}
    get = set = () => {}
    depsCache.delete(fn.init)
    delete fn.current
  })

  return value
}

export function primitive(val) {
  if (typeof val === 'object') return val === null
  return typeof val !== 'function'
}

export function observable(arg) {
  if (!arg) return false
  return !!(typeof arg === 'function' || arg[_observable] || arg[Symbol.asyncIterator] || arg.next || arg.then)
}

export function object (value) {
	if (Object.prototype.toString.call(value) !== '[object Object]') return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === null || prototype === Object.prototype;
}

export function input (arg) {
  return arg && (arg.tagName === 'INPUT' || arg.tagName === 'SELECT')
}
