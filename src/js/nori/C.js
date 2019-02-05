import Component from './Component';
import Is from './util/is';
import {removeAllElements} from "./browser/DOMToolbox";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

export const c = (node, props, ...args) => {

  props = props || {};

  //console.log('C:', node, props, args);

  let children = args.length ? [].concat(...args) : null;

  if (Is.string(node)) {
    return new Component(node, props, children);
  }

  return new node(props, children);
};

export const render = (component, domRoot, removeExisting = true) => {
  if (removeExisting) {
    removeAllElements(domRoot);
  }
  component.renderTo(domRoot);
};


// Simple implementation of React's useState hook, similar API totes different impl
// https://reactjs.org/docs/hooks-state.html

/*
Merge fn for updater
prevState => ({...prevState, ...updatedValues});
}
 */

let __stateValueMap = [];

export function useState(initial) {

  let stateIdx = __stateValueMap.length;

  if (!__stateValueMap[stateIdx]) {
    __stateValueMap[stateIdx] = initial;
  } else {
  }

  // console.log('useState', __stateValueMap);

  let setState = (newState) => {

    let currentValue = __stateValueMap[stateIdx];

    // console.log('updating the index at ', stateIdx, 'current value', currentValue);

    if (typeof newState === "function") {
      currentValue = newState(currentValue);
    } else {
      currentValue = newState;
    }

    __stateValueMap[stateIdx] = currentValue;

    return currentValue;
  };

  return [initial, setState];
}