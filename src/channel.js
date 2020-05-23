import { observer } from './util.js'


export default function createChannel () {
  const observers = []

  function push (v, dif) {
    if (v && v.then) v.then(push.bind(this))
    else this.current = v, (Array.isArray(this) ? this : channel.observers)
      .map(sub => {
        if (sub.out && sub.out.call) sub.out()
        if (sub.next) sub.out = sub.next(v, dif)
      })
  }

  const error = (e) => observers.map(sub => sub.error && sub.error(e))

  const close = () => {
      let unsubs = observers.map(sub => {
          if (sub.out && sub.out.call) sub.out()
          return sub.unsubscribe
      })
      observers.length = 0
      unsubs.map(unsub => unsub())
      channel.closed = true
  }

  const subscribe = (next, error, complete) => {
      next = next && next.next || next
      error = next && next.error || error
      complete = next && next.complete || complete

      const unsubscribe = () => {
          if (observers.length) observers.splice(observers.indexOf(subscription) >>> 0, 1)
          if (complete) complete()
          unsubscribe.closed = true
      }
      unsubscribe.unsubscribe = unsubscribe
      unsubscribe.closed = false

      const subscription = { next, error, complete, unsubscribe }
      observers.push(subscription)

      return unsubscribe
  }

  const channel = (...vals) => observer(...vals) ? subscribe(...vals) : push(...vals)

  return Object.assign(channel, {
      observers,
      closed: false,
      push,
      subscribe,
      close,
      error
  })
}

// class version of the same, supposed to be faster and consume less memory - not proved to be true
// export default class Channel {
//   constructor(get, set) {
//     this.observers = []
//     this.closed = false

//     // last pushed value
//     this.current

//     this.get = get
//     this.set = set
//   }
//   fn(){
//     if (this.closed) return
//     if (!arguments.length) return this.get()
//     if (observer(...arguments)) {
//       let unsubscribe = this.subscribe(...arguments)
//       // callback is registered as the last this subscription, so send it immediately as value
//       if ('current' in this) this.push.call(this.observers.slice(-1), this.get(), this.get())
//       return unsubscribe
//     }
//     return this.set(...arguments)

//     if (this.closed) return
//     if (!arguments.length) return this.get()
//     if (observer.apply(null, arguments)) {
//       const unsubscribe = this.subscribe(...arguments)
//       // callback is registered as the last channel subscription, so send it immediately as value
//       if ('current' in this) this.push.call(this.observers.slice(-1), this.get())
//       return unsubscribe
//     }
//     return this.set.apply(null, arguments)
//   }
//   push(v, dif){
//     if (v && v.then) v.then((v, dif) => this.push(v, dif))
//     else this.current = v, (Array.isArray(this) ? this : this.observers).map(sub => {
//       if (sub.out && sub.out.call) sub.out()
//       if (sub.next) sub.out = sub.next(v, dif)
//     })
//   }
//   subscribe(next, error, complete){
//     next = next && next.next || next
//     error = next && next.error || error
//     complete = next && next.complete || complete

//     const unsubscribe = () => {
//         if (this.observers.length) this.observers.splice(this.observers.indexOf(subscription) >>> 0, 1)
//         if (complete) complete()
//         unsubscribe.closed = true
//     }
//     unsubscribe.unsubscribe = unsubscribe
//     unsubscribe.closed = false

//     const subscription = { next, error, complete, unsubscribe }
//     this.observers.push(subscription)

//     return unsubscribe
//   }
//   close(){
//     let unsubs = this.observers.map(sub => {
//       if (sub.out && sub.out.call) sub.out()
//       return sub.unsubscribe
//     })
//     this.observers.length = 0
//     unsubs.map(unsub => unsub())
//     this.closed = true
//   }
//   error(e){
//     this.observers.map(sub => sub.error && sub.error(e))
//   }
// }
// delete Channel.prototype.fn.length