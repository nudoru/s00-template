/**
 * DOM functionality for Nori Components
 */

import {HTMLStrToNode} from "./browser/DOMToolbox";
import {arrify} from "./util/ArrayUtils";
import {domEventsList} from "./events/DomEvents";

// "Special props should be updated as new props are added to components. This is a bad design
const specialProps = domEventsList.concat(['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode']);

const $isSpecialProp = test => specialProps.includes(test);

export const createDOM = (type, props, children) => {
  let element = document.createElement(type);
  setProps(element, props);
  createElementTree(element, children);
  return element;
};

export const createElementTree = (hostNode, children) => arrify(children).map(el => createElement(el)).forEach(child => hostNode.appendChild(child));

export const createElement = child => {
  if (isNoriComponent(child)) {
    return child.$createVDOM();
  }
  return HTMLStrToNode(child);
};


const updateProp = (element, key, newValue, oldVaue) => {
  if (!newValue) {
    removeProp(element, key, oldVaue);
  } else if (!oldVaue || newValue !== oldVaue) {
    setProp(element, key, newValue);
  }
};

const updateProps = (element, newProps, oldProps = {}) => {
  let props = Object.assign({}, newProps, oldProps);
  Object.keys(props).forEach(key => {
    updateProp(element, key, newProps[key], oldProps[key]);
  });
};

export const setProps = (element, props) => Object.keys(props).forEach(key => {
  let value = props[key];
  setProp(element, key, value);
  return element;
});

export const setProp = (element, key, value) => {
  if (!$isSpecialProp(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }

    if (typeof value === 'boolean') {
      setBooleanProp(element, key, value);
    } else {
      element.setAttribute(key, value);
    }
  }
};

export const setBooleanProp = (element, key, value) => {
  if (value) {
    element.setAttribute(key, value);
    element[key] = true;
  } else {
    element[key] = false;
  }
};

export const removeProp = (element, key, value) => {
  if (!$isSpecialProp(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }

    if (typeof value === 'boolean') {
      removeBooleanProp(element, key);
    } else {
      element.removeAttribute(key);
    }
  }
};

export const removeBooleanProp = (element, key) => {
  element.removeAttribute(key);
  element[key] = false;
};


export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

export const removeChild = child => {
  if (isNoriComponent(child)) {
    child.remove();
  }
};

export const removeChildren = children => children.forEach(removeChild);