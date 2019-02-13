import {equals} from 'ramda';
import Is from './util/is';
import {arrify} from "./util/ArrayUtils";
import {
  HTMLStrToNode,
  isElementInViewport,
  offset,
  position,
  replaceElementWith
} from './browser/DOMToolbox';
import {getNextId} from './util/ElementIDCreator';
import {
  $applyTriggers,
  $mapTriggers,
  $performBehavior,
  $removeTriggers,
  BEHAVIOR_RENDER,
  BEHAVIOR_STATECHANGE,
  BEHAVIOR_UPDATE,
  BEHAVIOR_WILLREMOVE
} from './Eventing';

/*
Simple string based component to quickly get html on the screen

TODO
- rename triggers to actions
- break out events into own key in the props
- break out tweens into own key in the props - on over, out, click, move, enter, exit
- styles
 */

export default class DOMComponent {

  constructor(type, props, children) {
    this.type            = type;
    this.props           = props || {};
    this.props.id        = props.key || getNextId();
    this.props.children  = Is.array(children) ? children : [children];
    this.tweens          = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState   = props.hasOwnProperty('state') ? props.state : {};
    this.$$typeof        = Symbol.for('nori.component');
    this.renderedElement = null;
    this.triggerMap      = $mapTriggers(props.hasOwnProperty('triggers') ? props.triggers : {});
  }

  $isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

  set state(nextState) {
    if (!Is.object(nextState)) {
      console.warn('Component state must be an object');
      return;
    }

    if (equals(nextState, this.internalState)) {
      return;
    }

    this.internalState = Object.assign({}, this.internalState, nextState);
    $performBehavior(this.triggerMap, BEHAVIOR_STATECHANGE);
    this.willUpdate();
    this.$update();
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  get current() {
    if (!this.renderedElement) {
      console.warn(`No current element: component ${this.props.id} hasn't been rendered yet`);
    }
    return this.renderedElement;
  }

  get position() {
    return position(this.current);
  }

  get offset() {
    return offset(this.current);
    current: this.current
  }

  get isInViewport() {
    return isElementInViewport(this.current);
  }

  // If render returns  a component, don't use the tag for the element, just use all of what render returns
  // TODO get rid of the fragment?
  $createVDOM() {
    let fragment = document.createDocumentFragment(),
        element,
        result   = this.render();

    if (this.$isNoriComponent(result)) {
      // Was custom render, returned a component
      // TODO allow for an array to be returned rather than only one child
      element = result.$createVDOM().firstChild;
      fragment.appendChild(element)
    } else {
      // Non-custom component, just returned an array of children
      element = document.createElement(this.type);
      fragment.appendChild(element);
      this.$setProps(element, this.props);
      // If result isn't an array each child will be created individually
      // Ensure result is an array
      arrify(result).map(el => this.$createElement(el)).forEach(child => element.appendChild(child));
    }

    $applyTriggers(this.triggerMap, element);
    $performBehavior(this.triggerMap, BEHAVIOR_RENDER);

    this.renderedElement = fragment.firstChild;
    return fragment;
  }

  $createElement = child => {
    if (Is.string(child)) {
      return HTMLStrToNode(child);
    } else if (this.$isNoriComponent(child)) {
      return child.$createVDOM();
    } else {
      console.error(`createElement, unexpected type ${child}`);
    }
  };

  // TODO: diff and patch rather than just replace
  // Simple example here: https://github.com/heiskr/prezzy-vdom-example
  // https://blog.javascripting.com/2016/10/05/building-your-own-react-clone-in-five-easy-steps/
  // https://medium.com/@deathmood/how-to-write-your-own-virtual-dom-ee74acc13060
  $update() {
    if (!this.renderedElement) {
      console.warn(`Component not rendered, can't update!`, this.type, this.props);
      return;
    }
    const prevEl = this.renderedElement;
    this.remove();
    const newEl = this.$createVDOM();
    replaceElementWith(prevEl, newEl);
    $performBehavior(this.triggerMap, BEHAVIOR_UPDATE);
    this.didUpdate();
  }

  $isSpecialProp = test => ['tweens', 'state', 'triggers', 'children', 'element', 'min', 'max', 'mode'].includes(test);

  // TODO filter out non-HTML attributes
  // TODO set boolean props?
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
  $setProps = (element, props) => Object.keys(props).forEach(key => {
    if (!this.$isSpecialProp(key)) {
      let value = props[key];
      if (key === 'className') {
        key = 'class';
      } else if (key === 'id') {
        key = 'data-nid';
      }
      element.setAttribute(key, value);
    }
  });

  remove() {
    $performBehavior(this.triggerMap, BEHAVIOR_WILLREMOVE);
    this.willRemove();
    $removeTriggers(this.triggerMap, this.renderedElement);
    this.props.children.forEach(child => {
      if (this.$isNoriComponent(child)) {
        child.remove();
      }
    });
    this.renderedElement = null;
  }

  // Stub "lifecycle" methods. Override in subclass.
  // Works around applying triggers for this behaviors a level above the component to where the component is used
  willRemove = () => {
  };
  didDelete  = () => {
  };
  willUpdate = () => {
  };
  didUpdate  = () => {
  };

  // Returns the children (or view). Override in subclass for custom
  render() {
    return this.props.children;
  }

}