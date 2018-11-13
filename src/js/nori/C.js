import Component from './Component';
import Is from './util/is';
import {removeAllElements} from "./browser/DOMToolbox";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

export const c = (node, props, ...args) => {

  props = props || {};

  console.log('C:', node, props, args);

  let children = args.length ? [].concat(...args) : null;

  if (Is.string(node)) {
    return new Component(node, props, children);
  }

  return new node(props, children);
};

export const render = (component, domRoot, removeExisting = true) => {
  if(removeExisting) {
    removeAllElements(domRoot);
  }
  component.renderTo(domRoot);
};