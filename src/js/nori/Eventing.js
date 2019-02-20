/**
 * Events and actions for Nori Components
 */

import {isDomEvent} from "./events/DomEvents";

const ACTION_EVENT    = 'event';
const ACTION_BEHAVIOR = 'behavior';

let eventMap = {};

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

export const setEvents = (node, $element) => {
  const props = node.props || {};

  mapActions(props).forEach(evt => {
    if (evt.type === ACTION_EVENT) {
      const nodeId = node.props.id;
      evt.internalHandler = handleEventTrigger(evt, $element);
      $element.addEventListener(evt.event, evt.internalHandler);
      if(!eventMap.hasOwnProperty(nodeId)) {
        eventMap[nodeId] = [];
      }
      eventMap[nodeId].push(() => $element.removeEventListener(evt.event, evt.internalHandler));
    }
  });
};

export const removeEvents = id => {
  if(eventMap.hasOwnProperty(id)) {
    eventMap[id].map(fn => {
      fn();
      return null;
    });
    delete eventMap[id];
  }
};

const handleEventTrigger = (evt, $src) => e => evt.externalHandler(createEventObject(e, $src));

const createEventObject = (e, $src = null) => ({
  event : e,
  target: $src
});