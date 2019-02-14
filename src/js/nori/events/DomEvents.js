//https://developer.mozilla.org/en-US/docs/Web/Events
export const domEventsList = [
  'focus',
  'blur',
  'resize',
  'scroll',
  'keydown',
  'keypress',
  'keyup',
  'mouseenter',
  'mousemove',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'contextmenu',
  'wheel',
  'mouseleave',
  'mouseout',
  'select'
];

export const isDomEvent = e => domEventsList.includes(e);