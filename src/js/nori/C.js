import Component from './Component';
import Is from './util/is';

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

export const c = (tag, props, ...args) => {

  props = props || {};

  console.log('C!', tag, props, args);

  let children = args.length ? [].concat(...args) : null;

  if (Is.string(tag)) {
    return new Component(tag, props, children);
  }
  // TODO what should this be other than a div?
  return new tag(`div`, props, children);
};

export const render = (component, root) => {
  component.renderTo(root);
};