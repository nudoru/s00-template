/**
 * DOM functionality for Nori Components
 */

import {HTMLStrToNode} from "./browser/DOMToolbox";
import {arrify} from "./util/ArrayUtils";

const $isSpecialProp = test => ['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode'].includes(test);

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

// TODO filter out non-HTML attributes
// TODO set boolean props?
// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
export const setProps = (element, props) => Object.keys(props).forEach(key => {
  if (!$isSpecialProp(key)) {
    let value = props[key];
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }
    element.setAttribute(key, value);
  }
  return element;
});

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

export const removeChild = child => {
  if (isNoriComponent(child)) {
    child.remove();
  }
};

export const removeChildren = children => children.forEach(removeChild);