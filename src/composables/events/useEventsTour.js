import { ref } from 'vue'

// The guide for the Events pages (map and list). It is shared state (not one per page) because the guide moves from
// the map to the list while it is open, and it must keep going across that page change.
//
//   open:     is the guide showing
//   command:  what the guide asks the map to do: { type: 'select' | 'zoom' | 'fit' | 'clear', id, n }
//             (n goes up every time, so asking for the same thing twice still counts)

const open = ref(false)
const command = ref({ type: '', id: null, n: 0 })

export function useEventsTour() {
  function start() {
    open.value = true
  }
  function stop() {
    open.value = false
    send('clear')
    send('fit')
  }
  function send(type, id = null) {
    command.value = { type, id, n: command.value.n + 1 }
  }
  return { open, command, start, stop, send }
}
