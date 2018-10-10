import Mustache from 'mustache';
import Is from './util/is';
import {appendElement, removeElement, HTMLStrToNode} from './browser/DOMToolbox';
import {getNextId} from './util/ElementIDCreator';

// 😱 at the mutations!
export default class Component {

  constructor(tag, htmlStr, props = {}, state = {}) {
    if (!htmlStr || !tag) {
      console.error('Component must be created with tag and html');
    }

    this.tag           = tag;
    this.htmlStr       = htmlStr;
    this.internalProps = props;
    this.internalState = state;

    this.internalProps.id = this.internalProps.id || getNextId();
    this.elementFragment  = null;
    this.renderedElement  = null;
    this.rootElement      = null;
    this.componentEvents = [];
  }

  set state(nextState) {
    // TODO validate it's an object
    // TODO deep compare?
    this.internalState = Object.assign({}, this.internalState, nextState);
    // TODO some kind of notification or binding, rerender?
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  get props() {
    return Object.assign({}, this.internalProps);
  }

  get current() {
    if (!this.elementFragment) {
      console.warn(`Component ${this.internalProps.id} hasn't been rendered yet`);
    }
    return this.renderedElement;
  }


  $getInnerHTML() {
    return Mustache.render(this.htmlStr, this.internalState);
  }

  $getTagAttributes() {
    return Object.keys(this.internalProps).reduce((acc, c) => {
      let key = c;
      let value = this.internalProps[key];

      if(c === 'className') {
        key = 'class';
      }

      if(Is.func(value)) {
        // Assume these are vents, push it to a list and assign these after the fragment is created
        this.componentEvents.push({event:key, handler:value});
      } else {
        acc.push(`${key}=${value}`);
      }

      return acc;
    }, []).join(' ');
  }

  $getTag() {
    return `<${this.tag} ${this.$getTagAttributes()}>${this.$getInnerHTML()}</${this.tag}>`
  }

  $render() {
    this.elementFragment = HTMLStrToNode(this.$getTag());
    //this is done on the id prop now this.elementFragment.firstElementChild.setAttribute('data-nid', this.props.id);
    this.componentEvents.forEach(evt => {
      this.elementFragment.firstElementChild.addEventListener(evt.event, evt.handler);
    });
  }

  renderTo(root, onRenderFn) {
    this.rootElement = root;
    this.$render();
    appendElement(root, this.elementFragment);
    this.renderedElement = root.lastChild;
    if (onRenderFn) {
      onRenderFn(this.renderedElement);
    }
  }

  remove() {
    this.componentEvents.forEach(evt => {
      this.renderedElement.removeEventListener(evt.event, evt.handler);
    });
    removeElement(this.renderedElement);
  }

}