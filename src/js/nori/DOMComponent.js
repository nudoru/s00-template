import {equals} from 'ramda';
import Is from './util/is';
import {getNextId} from './util/ElementIDCreator';
import {
  BEHAVIOR_RENDER,
  BEHAVIOR_STATECHANGE,
  BEHAVIOR_UPDATE,
  BEHAVIOR_WILLREMOVE
} from './Eventing';
import {enqueueUpdate} from "./Nori";

export default class DOMComponent {

  constructor(type, props, children) {
    this.type            = type;
    this.props           = props || {};
    this.props.id        = props.key || getNextId();
    this.props.children  = Is.array(children) ? children : [children];
    this.tweens          = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState   = props.hasOwnProperty('state') ? props.state : {};
    this.internalCurrent = null;
    this.internalVDOM = null;
    this.$$typeof        = Symbol.for('nori.component');
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
    this.componentWillUpdate();
    enqueueUpdate(this.props.id);
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  set current(el) {
    this.internalCurrent = el;
  }

  get current() {
    return this.internalCurrent;
  }

  set vdom(v) {
    this.internalVDOM = v;
  }

  get vdom() {
    return this.internalVDOM;
  }

  forceUpdate() {
    enqueueUpdate(this.props.id);
  }

  //--------------------------------------------------------------------------------
  // Stub "lifecycle" methods. Override in subclass.
  //--------------------------------------------------------------------------------

  componentDidMount    = () => {
  };
  componentWillUnmount = () => {
  };
  componentWillUpdate  = () => {
  };
  componentDidUpdate   = () => {
  };

  remove() {
    this.internalCurrent = null;
    this.internalVDOM = null;
  }

}