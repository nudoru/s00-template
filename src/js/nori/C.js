import Component from './Component';
import Is from './util/is';

export const c = (componentType, props, children) => {
  if(Is.string(componentType)) {
      return new Component(componentType, props, children);
  }
  // TODO what should this be other than a div
  return new componentType(`div`, props, children);
};

export const render = (component, root) => {
  component.renderTo(root);
};