import Mustache from 'mustache';
import {equals} from 'ramda';
import Is from './util/is';
import {
  appendElement,
  HTMLStrToNode,
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

    this.internalState         = null;
    this.internalProps.id      = this.internalProps.id || getNextId();
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

  $getChildren = (children) => children.map(child => this.$getChildValue(child)).join('');

  $getChildValue(child) {
    let innerValue;
    if (Is.string(child)) {
      innerValue = Mustache.render(child, this.internalState);
    } else if (Is.func(child)) {
      innerValue = child();
    } else if (Is.object(child) && typeof child.$getTag === 'function') {
      innerValue = child.$getTag();
    } else {
      console.warn(`Component ${this.internalProps.id} can't do anything with child of type ${typeof child}`);
      innerValue = 'ERR';
    }
    return innerValue;
  }

  // TODO don't render children as strings here
  $getTag = () => `<${this.tag} ${this.$getTagAttrsFromProps(this.internalProps)}>${this.$getChildren(this.children)}</${this.tag}>`;

  renderTo(root, onRenderFn) {
    const element = HTMLStrToNode(this.$getTag());
    appendElement(root, element);

    //TODO render children here and attach to this element

    this.renderedElementParent = root;
    this.renderedElement       = root.lastChild;

    this.$getEventsFromProps(this.internalProps).forEach(evt => {
      this.renderedElement.addEventListener(evt.event, evt.handler);
    });

    if (onRenderFn) {
      onRenderFn(this.renderedElement);
    }
  }

  remove() {
    this.$getEventsFromProps(this.internalProps).forEach(evt => {
      this.renderedElement.removeEventListener(evt.event, evt.handler);
    });

    this.children.forEach(child => {
      if(Is.object(child) && typeof child.remove === 'function') {
        child.remove();
      }
    });

    removeElement(this.renderedElement);
    this.renderedElementParent = null;
    this.renderedElement       = null;
  }

}