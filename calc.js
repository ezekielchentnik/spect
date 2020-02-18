import state from './state.js'
import { fx, primitive, changeable } from './fx.js'

export default function calc(fn, deps) {
  let prevDeps = deps.map(v => {
    if (!v || primitive(v)) return v
    if ('current' in v) return v.current
    if (changeable(v)) return
    if ('valueOf' in v) return v.valueOf()
    if (Symbol.toPrimitive in v) return v[Symbol.toPrimitive]
    return v
  })
  const value = state(fn(...prevDeps))

  const set = value.set
  value.set = () => {
    throw Error('setting read-only source')
  }

  // dfx logic, with initial prevDeps
  fx((...deps) => {
    if (deps.every((dep, i) => Object.is(dep, prevDeps[i]))) return
    prevDeps = deps
    set(fn(...deps))
  }, deps)

  return value
}
