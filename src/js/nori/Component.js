import Mustache from 'mustache';
import {equals} from 'ramda';
import Is from './util/is';
import {
  appendElement,
  HTMLStrToNode,
  isElementInViewport,
  offset,
  position,
  removeElement
} from './browser/DOMToolbox';
import {getNextId} from './util/ElementIDCreator';

/*
Simple string based component to quickly get html on the screen
 */
export default class Component {

  constructor(tag, props, children) {
    this.tag           = tag;
    this.children      = Is.array(children) ? children : [children];
    this.internalProps = props;

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
    // TODO notification or binding
    // TODO rerender
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  get props() {
    return Object.assign({}, this.internalProps);
  }

  get current() {
    if (!this.renderedElement) {
      console.warn(`Component ${this.internalProps.id} hasn't been rendered yet`);
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

  $getTagAttrsFromProps = (props) => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (!Is.func(value)) {
      acc.push(`${key}=${value}`);
    }
    return acc;
  }, []).join(' ');

  $getEventsFromProps = (props) => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (Is.func(value)) {
      acc.push({event: key, handler: value});
    }
    return acc;
  }, []);

  renderTo(root, onRenderFn) {
    const element = HTMLStrToNode(`<${this.tag} ${this.$getTagAttrsFromProps(this.internalProps)} data-id=${getNextId()}/>`);
    appendElement(root, element);

    this.renderedElementParent = root;
    this.renderedElement       = root.lastChild;

    this.$renderChildren(this.renderedElement);

    this.$getEventsFromProps(this.internalProps).forEach(evt => {
      this.renderedElement.addEventListener(evt.event, evt.handler);
    });

    if (onRenderFn) {
      onRenderFn(this.renderedElement);
    }
  }

  $renderChildren(root) {
    this.children.forEach(child => {
      if (Is.string(child)) {
        let text = document.createTextNode(Mustache.render(child, this.internalState));
        appendElement(root, text);
      } else if (Is.object(child) && typeof child.renderTo === 'function') {
        return child.renderTo(root);
      }
    });
  }

  remove() {
    this.$getEventsFromProps(this.internalProps).forEach(evt => {
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

    removeElement(this.renderedElement);
    this.renderedElement       = null;
    this.renderedElementParent = null;
  }
}