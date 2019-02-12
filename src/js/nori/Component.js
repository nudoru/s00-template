//import Mustache from 'mustache';
import {equals} from 'ramda';
import Is from './util/is';
import {arrify} from "./util/ArrayUtils";
import {
  HTMLStrToNode,
  isElementInViewport,
  offset,
  position,
  removeElement,
  replaceElementWith
} from './browser/DOMToolbox';
import {isDomEvent} from "./events/DomEvents";
import {getNextId} from './util/ElementIDCreator';

/*
Simple string based component to quickly get html on the screen

TODO
- strip non-html attrs from nodes
- break out events into own key in the props
- break out tweens into own key in the props - on over, out, click, move, enter, exit
- styles
- return a function that renders?
- COMPOSITION enable more functionality
  withShadow(alignRight(rootComp))
  are these styles or functionality?
- support gsap tweens
 */

const TRIGGER_EVENT    = 'event';
const TRIGGER_BEHAVIOR = 'behavior';

export const BEHAVIOR_RENDER      = 'render';       // on initial render only
export const BEHAVIOR_STATECHANGE = 'stateChange';
export const BEHAVIOR_UPDATE      = 'update';       // rerender
export const BEHAVIOR_WILLREMOVE  = 'willRemove';
export const BEHAVIOR_DIDDELETE   = 'didDelete';

const BEHAVIORS = [BEHAVIOR_WILLREMOVE, BEHAVIOR_RENDER, BEHAVIOR_STATECHANGE, BEHAVIOR_UPDATE];

const SPECIAL_PROPS = ['tweens', 'state', 'triggers'];

export default class Component {

  constructor(type, props, children) {
    this.type            = type;
    this.props          = props || {};
    this.props.children = Is.array(children) ? children : [children];

    this.attrs             = this.$filterSpecialProps(this.props); //props.hasOwnProperty('attrs') ? props.attrs : {};
    this.attrs['data-nid'] = getNextId();
    this.tweens            = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState     = props.hasOwnProperty('state') ? props.state : {};
    this.triggerMap        = this.$mapTriggers(props.hasOwnProperty('triggers') ? props.triggers : {});
    this.renderedElement = null;
  }

  $filterSpecialProps = (props) => Object.keys(props).reduce((acc, key) => {
    if (!SPECIAL_PROPS.includes(key)) {
      acc[key] = props[key];
    }
    return acc;
  }, {});

  set state(nextState) {
    if (!Is.object(nextState)) {
      console.warn('Component state must be an object');
      return;
    }

    if (equals(nextState, this.internalState)) {
      return;
    }

    this.internalState = Object.assign({}, this.internalState, nextState);
    this.$performBehavior(BEHAVIOR_STATECHANGE);
    // TODO call willupdate hook here?
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

  $mapTriggers = (props) => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (isDomEvent(key)) {
      acc.push({
        type           : TRIGGER_EVENT,
        event          : key,
        externalHandler: value, // passed in handler
        internalHandler: null   // Will be assigned in $applyTriggers
      });
    } else if (BEHAVIORS.includes(key)) {
      acc.push({
        type           : TRIGGER_BEHAVIOR,
        event          : key,
        externalHandler: value, // passed in handler
        internalHandler: null   // Not used for behavior
      });
    } else {
      console.warn(`Unknown component trigger '${key}'`);
    }

    return acc;
  }, []);

  $applyTriggers = (element, triggerMap) => triggerMap.forEach(evt => {
    // TRIGGER_BEHAVIOR are broadcast directly from the function where they occur
    if (evt.type === TRIGGER_EVENT) {
      evt.internalHandler = this.$handleEventTrigger(evt);
      // TODO implement options and useCapture? https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
      element.addEventListener(evt.event, evt.internalHandler);
    }
  });

  $createEventPacket = e => ({
    event    : e,
    component: this
  });

  $handleEventTrigger = evt => e => evt.externalHandler(this.$createEventPacket(e));

  $performBehavior = (behavior, e) => this.triggerMap.forEach(evt => {
    if (evt.type === TRIGGER_BEHAVIOR && evt.event === behavior) {
      // fake an event object
      let event = e || {type: behavior, target: this};
      evt.externalHandler(this.$createEventPacket(event));
    }
  });

  $removeTriggers = (element, triggerMap) => triggerMap.forEach(evt => {
    if (evt.type === TRIGGER_EVENT) {
      element.removeEventListener(evt.event, evt.internalHandler);
    } else if (evt.type === TRIGGER_BEHAVIOR) {
      // Behavior?
    }
  });

  // Stub "lifecycle" methods. Override in subclass.
  // Works around applying triggers for this behaviors a level above the component to where the component is used
  willRemove = () => {};
  didDelete = () => {};
  willUpdate = () => {};
  didUpdate = () => {};

  // Returns the children (or view). Override in subclass for custom
  render() {
    return this.props.children;
  }

  // If render returns  a component, don't use the tag for the element, just use all of what render returns
  // TODO get rid of the fragment?
  $render() {
    let fragment = document.createDocumentFragment(),
        element,
        rendered = this.render();

    if (Is.object(rendered)) {
      // Was custom render, returned a component
      // TODO allow for an array to be returned rather than only one child
      element = rendered.$render().firstChild;
      fragment.appendChild(element)
    } else {
      // Non-custom component, just returned an array of children
      element = document.createElement(this.type);
      fragment.appendChild(element);
      this.$setTagAttrs(element, this.attrs);
      // Ugh, if rendered isn't an array each child will be created individually
      arrify(rendered).map(el => {
        // console.log('creating element:',el);
        return this.$createElement(el)
      }).forEach(child => {
        // console.log('Appending child:', child);
        element.appendChild(child)
      });
    }

    this.$applyTriggers(element, this.triggerMap);
    this.$performBehavior(BEHAVIOR_RENDER);

    // move this out somewhere?
    this.renderedElement = fragment.firstChild;
    return fragment;
  }

  $createElement = child => {
    if (Is.string(child)) {
      // return HTMLStrToNode(Mustache.render(child, this.internalState));
      return HTMLStrToNode(child);
    } else if (Is.object(child) && typeof child.$render === 'function') {
      return child.$render();
    } else {
      console.warn(`createElement, unexpected type ${child}`);
      return HTMLStrToNode('Error');
    }
  };

  // TODO: diff and patch rather than just replace
  // Simple example here: https://github.com/heiskr/prezzy-vdom-example
  $update() {
    if (!this.renderedElement) {
      console.warn(`Component not rendered, can't update!`, this.type, this.props);
      return;
    }
    this.willUpdate();
    const prevEl = this.renderedElement;
    this.remove();
    const newEl = this.$render();
    replaceElementWith(prevEl, newEl);
    this.$performBehavior(BEHAVIOR_UPDATE);
    this.didUpdate();
  }

  // TODO filter out non-HTML attributes
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
  $setTagAttrs = (element, attributes) => Object.keys(attributes).forEach(key => {
    const excludeAttrs = ['element','children', 'min','max', 'mode'];
    if(!excludeAttrs.includes(key)) {
      // So, maybe I should use "className" == "class" ? Haven't had an issue yet ¯\_(シ)_/¯
      let value = attributes[key];
      element.setAttribute(key, value);
    }
  });

  remove() {
    this.$performBehavior(BEHAVIOR_WILLREMOVE);
    this.willRemove();
    this.$removeTriggers(this.renderedElement, this.triggerMap);
    this.props.children.forEach(child => {
      if (Is.object(child) && typeof child.remove === 'function') {
        child.remove();
      }
    });
  }

  delete() {
    this.remove();
    this.props.children.forEach(child => {
      if (Is.object(child) && typeof child.delete === 'function') {
        child.delete();
      }
    });
    removeElement(this.renderedElement);
    this.renderedElement = null;

    this.$performBehavior(BEHAVIOR_DIDDELETE);
    this.didDelete();
  }

}


/*
// These will require listeners
// export const BEHAVIOR_SCOLLIN     = 'scrollIn';
// export const BEHAVIOR_SCROLLOUT   = 'scrollOut';
// export const BEHAVIOR_MOUSENEAR   = 'mouseNear';

// also touch
  // getDistanceFromCursor(mevt) {
  //
  //   const offset = this.offset;
  // }
  //
  // also touch
  // getCursorPositionOnElement(mevt) {
  //
  // }
  //
  // $onScroll = e => {
  //   // TEST for in to view?
  // };
  //
  // $onMouseMove = e => {
  //   // test for proximity
  // };
 */