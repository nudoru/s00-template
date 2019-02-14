import {equals} from 'ramda';
import Is from './util/is';
import {replaceElementWith} from './browser/DOMToolbox';
import {getNextId} from './util/ElementIDCreator';
import {
  applyActions,
  BEHAVIOR_RENDER,
  BEHAVIOR_STATECHANGE,
  BEHAVIOR_UPDATE,
  BEHAVIOR_WILLREMOVE,
  mapActions,
  performBehavior,
  removeActions
} from './Eventing';
import {createDOM, isNoriComponent, removeChildren} from "./DOMing";

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
    this.actionMap       = mapActions(props.hasOwnProperty('actions') ? props.actions : {});
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
    performBehavior(this, BEHAVIOR_STATECHANGE);
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

  // First called from Nori.renderDOM() method
  $createVDOM() {
    let fragment   = document.createDocumentFragment(),
        resultTree = this.render(), // either array, text or component
        element;

    if (isNoriComponent(resultTree)) {
      element = resultTree.$createVDOM().firstChild;
    } else {
      element = createDOM(this.type, this.props, resultTree);
    }

    fragment.appendChild(element);
    applyActions(this, element);
    this.renderedElement = element;
    performBehavior(this, BEHAVIOR_RENDER);

    return fragment;
  }

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
    performBehavior(this, BEHAVIOR_UPDATE);
    this.didUpdate();
  }

  remove() {
    performBehavior(this, BEHAVIOR_WILLREMOVE);
    this.willRemove();
    removeActions(this.actionMap, this.renderedElement);
    removeChildren(this.props.children);
    this.renderedElement = null;
  }

  //--------------------------------------------------------------------------------
  // Stub "lifecycle" methods. Override in subclass.
  //--------------------------------------------------------------------------------

  willRemove = () => {
  };
  didDelete  = () => {
  };
  willUpdate = () => {
  };
  didUpdate  = () => {
  };

  render() {
    return this.props.children;
  }

}