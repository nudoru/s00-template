//https://developer.mozilla.org/en-US/docs/Web/Events
export const DomEvents = [
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

export const isDomEvent = e => DomEvents.indexOf(e) > -1;