import {isDomEvent} from "./events/DomEvents";

const ACTION_EVENT    = 'event';
const ACTION_BEHAVIOR = 'behavior';

export const BEHAVIOR_RENDER      = 'render';       // on initial render only
export const BEHAVIOR_STATECHANGE = 'stateChange';
export const BEHAVIOR_UPDATE      = 'update';       // rerender
export const BEHAVIOR_WILLREMOVE  = 'willRemove';
export const BEHAVIOR_DIDDELETE   = 'didDelete';

const BEHAVIORS = [BEHAVIOR_WILLREMOVE, BEHAVIOR_RENDER, BEHAVIOR_STATECHANGE, BEHAVIOR_UPDATE];

export const mapActions = props => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (isDomEvent(key)) {
      acc.push({
        type           : ACTION_EVENT,
        event          : key,
        externalHandler: value, // passed in handler
        internalHandler: null   // Will be assigned in applyActions
      });
    } else if (BEHAVIORS.includes(key)) {
      acc.push({
        type           : ACTION_BEHAVIOR,
        event          : key,
        externalHandler: value, // passed in handler
        internalHandler: null   // Not used for behavior, fn's just called when they occur in code
      });
    } else {
      console.warn(`Unknown component trigger '${key}'`);
    }

    return acc;
  }, []);

export const applyActions = (actionMap, element) => actionMap.forEach(evt => {
  if (evt.type === ACTION_EVENT) {
    evt.internalHandler = $handleEventTrigger(evt);
    // TODO implement options and useCapture? https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
    element.addEventListener(evt.event, evt.internalHandler);
  }
});

export const $createEventObject = e => ({
  event    : e,
  component: this
});

export const $handleEventTrigger = evt => e => evt.externalHandler($createEventObject(e));

export const performBehavior = (actionMap, behavior, e) => actionMap.forEach(evt => {
  if (evt.type === ACTION_BEHAVIOR && evt.event === behavior) {
    let event = e || {type: behavior, target: this};
    evt.externalHandler($createEventObject(event));
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