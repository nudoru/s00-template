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
- rename triggers to actions
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

const SPECIAL_PROPS = ['tweens', 'state', 'triggers', 'children'];

export default class DOMComponent {

  constructor(type, props, children) {
    this.type           = type;
    this.props          = props || {};
    this.props.id       = props.key || getNextId();
    this.props.children = Is.array(children) ? children : [children];

    this.tweens          = props.hasOwnProperty('tweens') ? props.tweens : {};
    this.internalState   = props.hasOwnProperty('state') ? props.state : {};
    this.triggerMap      = this.$mapTriggers(props.hasOwnProperty('triggers') ? props.triggers : {});
    this.renderedElement = null;
    this.$$typeof        = Symbol.for('nori.component');
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
      console.warn(`Component ${this.props.id} hasn't been rendered yet`);
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
        internalHandler: null   // Not used for behavior, fn's just called when they occur in code
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
    }
  });

  $createEventPacket = e => ({
    event    : e,
    component: this
  });

  $handleEventTrigger = evt => e => evt.externalHandler(this.$createEventPacket(e));

  $performBehavior = (behavior, e) => this.triggerMap.forEach(evt => {
    if (evt.type === TRIGGER_BEHAVIOR && evt.event === behavior) {
      let event = e || {type: behavior, target: this};
      evt.externalHandler(this.$createEventPacket(event));
    }
  });

  $removeTriggers = (element, triggerMap) => triggerMap.forEach(evt => {
    if (evt.type === TRIGGER_EVENT) {
      element.removeEventListener(evt.event, evt.internalHandler);
    }
    // behaviors don't have listeners
  });

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

  $isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

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
    this.willUpdate();
    const prevEl = this.renderedElement;
    this.remove();
    const newEl = this.$createVDOM();
    replaceElementWith(prevEl, newEl);
    this.$performBehavior(BEHAVIOR_UPDATE);
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
    this.$performBehavior(BEHAVIOR_WILLREMOVE);
    this.willRemove();
    this.$removeTriggers(this.renderedElement, this.triggerMap);
    this.props.children.forEach(child => {
      if (this.$isNoriComponent(child)) {
        child.remove();
      }
    });
  }

  delete() {
    this.remove();
    this.props.children.forEach(child => {
      if (this.$isNoriComponent(child)) {
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
Don't want to loose this ...

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