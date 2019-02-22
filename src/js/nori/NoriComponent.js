import Is from './util/is';
import {getNextId} from './util/ElementIDCreator';
import {enqueueUpdate} from "./Nori";

export default class NoriComponent {

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

    if(this.shouldComponentUpdate({}, nextState)) {
      this.internalState = Object.assign({}, this.internalState, nextState);
      this.componentWillUpdate();
      enqueueUpdate(this.props.id);
    }
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

  //https://reactjs.org/docs/shallow-compare.html
  shouldComponentUpdate(nextProps, nextState) {
    // Deep compare
    // return !equals(nextState, this.internalState); //equals is from Ramda
    // Shallow compare
    return !(nextState === this.internalState) || !(nextProps === this.props);
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