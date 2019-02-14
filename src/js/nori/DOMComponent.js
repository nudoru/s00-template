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

const STAGE_NOINIT   = 'stage_noinit';
const STAGE_RENDERED = 'stage_rendered';
const STAGE_UPDATING = 'stage_updating';

export default class DOMComponent {

  constructor(type, props, children) {
    this.stage          = STAGE_NOINIT;
    this.type           = type;
    this.props          = props || {};
    this.props.id       = props.key || getNextId();
    this.props.children = Is.array(children) ? children : [children];
    this.tweens         = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState  = props.hasOwnProperty('state') ? props.state : {};
    this.current        = null;
    this.actionMap      = mapActions(this.props);
    this.$$typeof       = Symbol.for('nori.component');
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
    this.$update();
  }

  get state() {
    return Object.assign({}, this.internalState);
  }

  $createVDOM() {
    let resultTree = this.render(),
        element;

    if (isNoriComponent(resultTree)) {
      element = resultTree.$createVDOM();
    } else {
      element = createDOM(this.type, this.props, resultTree);
    }

    applyActions(this, element);
    this.current = element;

    if (this.stage === STAGE_NOINIT) {
      this.componentDidMount();
    }

    this.stage = STAGE_RENDERED;
    return element;
  }

  forceUpdate() {
    this.$update();
  }

  $update() {
    let prevEl, newEl;

    if (this.stage === STAGE_NOINIT) {
      console.warn(`Can't update ${this.props.id} because it hasn't been rendered first`);
      return;
    }

    this.stage = STAGE_UPDATING;
    prevEl     = this.current;
    this.remove();
    newEl = this.$createVDOM();
    replaceElementWith(prevEl, newEl);
    this.componentDidUpdate();
  }

  remove() {
    if(this.stage !== STAGE_UPDATING) {
      this.componentWillUnmount();
    }
    removeActions(this.actionMap, this.current);
    removeChildren(this.props.children);
    this.current = null;
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

  render() {
    return this.props.children;
  }

}