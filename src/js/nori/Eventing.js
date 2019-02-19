/**
 * Events and actions for Nori Components
 */

import {isDomEvent} from "./events/DomEvents";

const ACTION_EVENT    = 'event';
const ACTION_BEHAVIOR = 'behavior';

const BEHAVIORS = [];

export const mapActions = props => Object.keys(props).reduce((acc, key) => {
  let value      = props[key],
      domEvt     = isDomEvent(key),
      actionType = domEvt ? ACTION_EVENT : ACTION_BEHAVIOR;

  if (domEvt || BEHAVIORS.includes(key)) {
    acc.push({
      type           : actionType,
      event          : key,
      externalHandler: value,
      internalHandler: null
    });
  }
  return acc;
}, []);

export const setEvents = (props = {}, element = null) => mapActions(props).forEach(evt => {
  if (evt.type === ACTION_EVENT) {
    evt.internalHandler = handleEventTrigger(evt, element);
    element.addEventListener(evt.event, evt.internalHandler);
  }
});

export const handleEventTrigger = (evt, src) => e => evt.externalHandler(createEventObject(e, src));

export const createEventObject = (e, src = null) => ({
  event : e,
  target: src
});

// TODO implement options and useCapture? https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
// export const applyActions = (component, element) => component.actionMap.forEach(evt => {
//   if (evt.type === ACTION_EVENT) {
//     evt.internalHandler = handleEventTrigger(evt, component);
//     element.addEventListener(evt.event, evt.internalHandler);
//   }
// });

export const performBehavior = (component, behavior, e) => component.actionMap.forEach(evt => {
  if (evt.type === ACTION_BEHAVIOR && evt.event === behavior) {
    let event = e || {type: behavior, target: this};
    evt.externalHandler(createEventObject(event, component));
  }
});

// behaviors don't have listeners
export const removeActions = (actionMap, element) => actionMap.forEach(evt => {
  if (evt.type === ACTION_EVENT) {
    element.removeEventListener(evt.event, evt.internalHandler);
  }
});

/*
Don't want to loose this ...

// export const BEHAVIOR_SCOLLIN     = 'scrollIn';
// export const BEHAVIOR_SCROLLOUT   = 'scrollOut';
// export const BEHAVIOR_MOUSENEAR   = 'mouseNear';

// also touch
  // getDistanceFromCursor(mevt) {
  //
  //   const offset = this.offset;
  // }
  //
  // also touch
  // getCursorPositionOnElement(mevt) {
  //
  // }
  //
  // $onScroll = e => {
  //   // TEST for in to view?
  // };
  //
  // $onMouseMove = e => {
  //   // test for proximity
  // };
 */