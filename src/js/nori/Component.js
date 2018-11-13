import Mustache from 'mustache';
import {equals, defaultTo} from 'ramda';
import Is from './util/is';
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
- treat 'class' prop like React does and rename it to 'className'?
- FRAGMENT - empty node that just renders it's children
- break out events into own key in the props
- break out tweens into own key in the props - on over, out, click, move, enter, exit
- styles
- return a function that renders?
- COMPOSITION enable more functionality
  withShadow(alignRight(rootComp))
  are these styles or functionality?
- support gsap tweens
- extract DOM code to another module? Keep this "virtual"
 */

const TRIGGER_EVENT    = 'event';
const TRIGGER_BEHAVIOR = 'behavior';

// These will require listeners
// export const BEHAVIOR_SCOLLIN     = 'scrollIn';
// export const BEHAVIOR_SCROLLOUT   = 'scrollOut';
// export const BEHAVIOR_MOUSENEAR   = 'mouseNear';
export const BEHAVIOR_RENDER      = 'render';       // on initial render only
export const BEHAVIOR_STATECHANGE = 'stateChange';
export const BEHAVIOR_UPDATE      = 'update';       // rerender
export const BEHAVIOR_WILLREMOVE  = 'willRemove';
export const BEHAVIOR_DIDDELETE   = 'didDelete';

const BEHAVIORS = [BEHAVIOR_WILLREMOVE, BEHAVIOR_RENDER, BEHAVIOR_STATECHANGE, BEHAVIOR_UPDATE];

const SPECIAL_PROPS = ['tweens','state','triggers'];

export default class Component {

  constructor(tag, props, children) {
    this.tag      = tag;
    this.children = Is.array(children) ? children : [children];
    this.props    = props || {};

    this.attrs         = this.$filterSpecialProps(this.props); //props.hasOwnProperty('attrs') ? props.attrs : {};
    this.tweens        = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState = props.hasOwnProperty('state') ? props.state : {};
    this.triggerMap    = this.$mapTriggers(props.hasOwnProperty('triggers') ? props.triggers : {});

    this.renderedElement       = null;
    this.renderedElementParent = null;
  }

  $filterSpecialProps = (props) => Object.keys(props).reduce((acc, key) => {
    if(!SPECIAL_PROPS.includes(key)) {
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

  // // also touch
  // getDistanceFromCursor(mevt) {
  //
  //   const offset = this.offset;
  // }
  //
  // // also touch
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

  $mapTriggers = (props) => Object.keys(props).reduce((acc, key) => {
    let value = props[key];
    if (isDomEvent(key)) {
      acc.push({
        type           : TRIGGER_EVENT,
        event          : key,
        externalHandler: value, // passed in handler
        internalHandler: null   // Will be assigned in $applyTriggers
      });
    } else if (BEHAVIORS.indexOf(key)) {
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
    if (evt.type === TRIGGER_EVENT) {
      evt.internalHandler = this.$handleEventTrigger(evt);
      // TODO implement options and useCapture? https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
      element.addEventListener(evt.event, evt.internalHandler);
    } else if (evt.type === TRIGGER_BEHAVIOR) {
      // Triggers are broadcast directly from the function where they occur
    } else {
      //
    }
  });

  $createEventPacket = e => ({
    event    : e,
    component: this,
    element  : this.current
  });

  $handleEventTrigger = evt => e => evt.externalHandler(this.$createEventPacket(e));

  // $handleBehaviorTrigger = behavior => e => {
  //   console.log(`${behavior}:`, e)
  // };

  $performBehavior = (behavior, e) => this.triggerMap.forEach(evt => {
    if (evt.type === TRIGGER_BEHAVIOR && evt.event === behavior) {
      // fake an event object
      let event = e || {type: behavior, target: this.current};
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

  $render() {
    let fragment           = document.createDocumentFragment();
    let element            = document.createElement(this.tag);
    this.attrs['data-nid'] = getNextId(); // create a unique ID for every render
    this.$setTagAttrs(element, this.attrs);
    this.$renderChildren(element);
    fragment.appendChild(element);
    this.$applyTriggers(element, this.triggerMap);
    return element;
  }

  $setTagAttrs = (element, attributes) => Object.keys(attributes).forEach(key => {
    let value = attributes[key];
    element.setAttribute(key, value);
  });

  $renderChildren = root => this.children.forEach(child => {
    if (Is.string(child)) {
      let text = HTMLStrToNode(Mustache.render(child, this.internalState));
      root.appendChild(text);
    } else if (Is.object(child) && typeof child.renderTo === 'function') {
      child.renderTo(root);
    }
  });

  renderTo(root) {
    if (!root) {
      console.error(`Component: Can't render component to null root`);
    }
    const element = this.$render();
    root.appendChild(element);

    this.renderedElementParent = root;
    this.renderedElement       = root.lastChild;

    this.$performBehavior(BEHAVIOR_RENDER);
  }

  $update() {
    if (this.renderedElement) {
      this.remove();
      this.renderedElement = replaceElementWith(this.renderedElement, this.$render());
      this.$performBehavior(BEHAVIOR_UPDATE);
    } else {
      console.warn(`Component not rendered, can't update!`);
      console.log(this.tag, this.props);
    }
  }

  remove() {
    this.$performBehavior(BEHAVIOR_WILLREMOVE);

    this.$removeTriggers(this.renderedElement, this.triggerMap);
    this.children.forEach(child => {
      if (Is.object(child) && typeof child.remove === 'function') {
        child.remove();
      }
    });
  }

  delete() {
    this.remove();
    this.children.forEach(child => {
      if (Is.object(child) && typeof child.delete === 'function') {
        child.delete();
      }
    });
    removeElement(this.renderedElement);
    this.renderedElement       = null;
    this.renderedElementParent = null;

    this.$performBehavior(BEHAVIOR_DIDDELETE);
  }

}