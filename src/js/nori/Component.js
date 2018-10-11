import Mustache from 'mustache';
import {equals} from 'ramda';
import Is from './util/is';
import {
  HTMLStrToNode,
  isElementInViewport,
  offset,
  position,
  removeElement,
  replaceElementWith
} from './browser/DOMToolbox';

import {getNextId} from './util/ElementIDCreator';

/*
Simple string based component to quickly get html on the screen

TODO
- h like helper fn that returns a new instance
  - first param accepts string tag type or comp class?
- support gsap tweens
- rerender on state update
 */
export default class Component {

  constructor(tag, props, children) {
    this.tag      = tag;
    this.children = Is.array(children) ? children : [children];
    this.props    = props;

    this.attrs                 = props.attrs || {};
    this.internalState         = {};
    this.renderedElement       = null;
    this.renderedElementParent = null;
  }

  set state(nextState) {
    if (!Is.object(nextState)) {
      console.warn('Component state must be an object');
      return;
    }

    if (equals(nextState, this.internalState)) {
      return;
    }

    this.internalState = Object.assign({}, this.internalState, nextState);
    this.$update();
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  get current() {
    if (!this.renderedElement) {
      console.warn(`Component ${this.attrs.id} hasn't been rendered yet`);
    }
    return this.renderedElement;
  }

  get position() {
    return position(this.current);
  }

  get offset() {
    return offset(this.current);
  }

  get isInViewport() {
    return isElementInViewport(this.current);
  }

  $getEventsAttrs = (props) => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (Is.func(value)) {
      acc.push({event: key, handler: value});
    }
    return acc;
  }, []);

  $render() {
    let fragment = document.createDocumentFragment();
    let element = document.createElement(this.tag);
    this.attrs['data-nid'] = getNextId(); // create a unique ID for every render
    this.$setTagAttrs(element)(this.attrs);
    this.$renderChildren(element);
    fragment.appendChild(element);

    this.$getEventsAttrs(this.attrs).forEach(evt => {
      element.addEventListener(evt.event, evt.handler);
    });

    return element;
  }

  $setTagAttrs = (element) => (props) => Object.keys(props).forEach(key => {
    let value = props[key];
    if (!Is.func(value)) {
      element.setAttribute(key, value);
    }
  });

  $renderChildren(root) {
    this.children.forEach(child => {
      if (Is.string(child)) {
        let text = HTMLStrToNode(Mustache.render(child, this.internalState));
        root.appendChild(text);
      } else if (Is.object(child) && typeof child.renderTo === 'function') {
        return child.renderTo(root);
      }
    });
  }

  renderTo(root) {
    if(!root) {
      console.error(`Can't render component to null root`);
    }
    const element = this.$render();
    root.appendChild(element);

    this.renderedElementParent = root;
    this.renderedElement       = root.lastChild;
  }

  $update() {
    this.remove();
    this.renderedElement = replaceElementWith(this.renderedElement, this.$render())
  }

  remove() {
    this.$getEventsAttrs(this.attrs).forEach(evt => {
      try {
        this.renderedElement.removeEventListener(evt.event, evt.handler);
      } catch (e) {
      }
    });
    this.children.forEach(child => {
      if (Is.object(child) && typeof child.remove === 'function') {
        child.remove();
      }
    });
  }

  delete() {
    this.remove();
    this.children.forEach(child => {
      if (Is.object(child) && typeof child.delete === 'function') {
        child.delete();
      }
    });
    removeElement(this.renderedElement);
    this.renderedElement       = null;
    this.renderedElementParent = null;
  }

}