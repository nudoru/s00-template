import {cloneDeep} from 'lodash';
import Is from './util/is';
import {getNextId} from './util/ElementIDCreator';
import {enqueueUpdate} from "./Nori";

export default class NoriComponent {

  constructor(props) {
    this.props             = props || {};
    this.props.id          = props.key ? props.key : (props.id ? props.id : getNextId());
    this.props.key         = props.key || null;
    this._internalState    = props.hasOwnProperty('state') ? props.state : {};
    this._isDirty          = true;
    this._memoRenderResult = null;
    this._lastRenderedDOMEl = null;
    this.$$typeof          = Symbol.for('nori.component');

    if (typeof this.render !== 'function') {
      console.error(`Component ${this.props.id} doesn't have a render() method!`);
    }
  }

  set state(nextState) {
    if (!Is.object(nextState)) {
      console.warn('Component state must be an object');
      return;
    }

    if (this.shouldComponentUpdate({}, nextState)) {
      this._internalState = Object.assign({}, this._internalState, nextState);
      if (typeof this.componentWillUpdate === 'function') {
        this.componentWillUpdate();
      }
      this._isDirty = true;
      enqueueUpdate(this.props.id);
    }
  }

  get state() {
    // return Object.assign({}, this._internalState);
    return cloneDeep(this._internalState);
  }

  shouldComponentUpdate(nextProps, nextState) {
    // Deep compare using Ramda !equals(nextState, this._internalState);
    return !(nextState === this._internalState) || !(nextProps === this.props);
  }

  set $current($el) {
    this._lastRenderedDOMEl = $el;
  }

  get $current() {
    return this._lastRenderedDOMEl;
  }

  forceUpdate() {
    enqueueUpdate(this.props.id);
  }

  internalRender() {
    if (this._isDirty || !this._memoRenderResult) {
      const result = this.render();
      if (!result.props.id) {
        result.props.id = this.props.id;
      }

      result.children.forEach((child, i) => {
        if (typeof child === 'object' && !child.props.id) {
          child.props.id = this.props.id + `.${i}`;
        }
      });

      this._isDirty          = false;
      this._memoRenderResult = result;
    }
    return this._memoRenderResult;
  }

  remove() {
    // Nothing here
  }

}