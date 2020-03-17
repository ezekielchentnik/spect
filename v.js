import _observable from 'symbol-observable'
import c, { observer } from './channel.js'


export default function v(init, map=v=>v, unmap=v=>v) {
  const channel = c()

  const value = Object.assign((...args) => (
    !args.length ? value.get() :
    observer(...args) ? value.subscribe(...args) :
    value.set(...args)
  ), channel)

  // add listener
  value.subscribe = callback => {
    let unsubscribe = channel.subscribe(callback)
    // callback is registered as the last channel subscription, so send it immediately as value
    if ('current' in value) channel.push(value.get(), channel.subs.slice(-1))
    return unsubscribe
  }

  // current is mapped value (map can be heavy)
  value.get = () => value.current

  // observ
  if (typeof init === 'function') {
    value.set = v => init(unmap(v))
    channel.subscribe(null, null, init(v => value.push(value.current = map(v))))
  }
  // Observable (stateless)
  else if (init && init[_observable]) {
    value.set = noop
    let unsubscribe = init[_observable]().subscribe({next: v => value.push(value.current = map(v))})
    unsubscribe = unsubscribe.unsubscribe || unsubscribe
    channel.subscribe(null, null, () => unsubscribe())
  }
  // group
  // NOTE: array/object may have _observable, so it should go after
  else if (Array.isArray(init) || object(init)) {
    let vals = value.current = new init.constructor
    const depsChannel = c(), deps = []
    for (let name in init) {
      let dep = init[name], depv = v(dep)
      depv(v => (vals[name] = v, depsChannel(vals)))
      deps.push(depv)
    }
    depsChannel(v => value.push(value.current = map(v)))
    if (Object.keys(vals).length || !Object.keys(init).length) depsChannel(vals)
    value.set = v => (value.push(value.current = map(unmap(v))))
    channel.subscribe(null, null, () => (deps.map(depv => depv.cancel()), depsChannel.cancel()))
  }
  // input
  else if (init && (init.tagName === 'INPUT' || init.tagName === 'SELECT')) {
    const el = init

    const get = el.type === 'checkbox' ? () => el.checked : () => el.value

    const set = {
      text: value => el.value = (value == null ? '' : value),
      checkbox: value => (el.checked = value, el.value = (value ? 'on' : ''), value ? el.setAttribute('checked', '') : el.removeAttribute('checked')),
      'select-one': value => ([...el.options].map(el => el.removeAttribute('selected')), el.value = value, el.selectedOptions[0].setAttribute('selected', ''))
    }[el.type]

    value.set = v => (set(unmap(v)), value.push(value.current = get()))
    // normalize initial value
    value.set(get())

    const update = e => value.set(get())
    el.addEventListener('change', update)
    el.addEventListener('input', update)
    channel.subscribe(null, null, () => {
      value.set = noop
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
        value.push(value.current = map(v))
      }
    })()
    value.set = noop
    channel.subscribe(null, null, () => stop = true)
  }
  // promise (stateful, initial undefined)
  else if (init && init.then) {
    value.set = p => (delete value.current, p.then(v => value.push(value.current = map(v))))
    value.set(init)
  }
  // plain value
  else {
    value.set = v => value.push(value.current = map(unmap(v)))
    if (arguments.length) value.set(init)
  }

  value.valueOf = value.toString = value[Symbol.toPrimitive] = value.get

  // cancel subscriptions, dispose
  channel.subscribe(null, null, () => {
    value.canceled = true
    delete value.current
  })

  return value
}

function noop () {}

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
