/*
TODO
  - ust createComponetVDOM fn rather than rerender
  - use ImmutableJS data structures
  - unify child render code
  - test fn as prop value
  - test my mouse renderprops
  - what happens if an update is enququed while the update loop is updating vdom?
  - in component constructor, call super w/ only props
 */


import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {getNextId} from "./util/ElementIDCreator";
import {cloneDeep} from 'lodash';
import {
  enqueueDidMount,
  enqueueDidUpdate,
  getDidUpdateQueue,
  performDidMountQueue,
  performDidUpdateQueue
} from './LifecycleQueue';

let currentHostTree,
    $hostNode,
    componentInstanceMap = {},
    updateTimeOut,
    eventMap             = {};

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

const isVDOMNode        = node => typeof node === 'object' && node.hasOwnProperty('type') && node.hasOwnProperty('props') && node.hasOwnProperty('children');
const cloneNode         = node => cloneDeep(node); // Warning: Potentially expensive
const hasOwnerComponent = node => node.hasOwnProperty('owner') && node.owner !== null;
const isEvent           = event => /^on/.test(event);
const getEventName      = event => event.slice(2).toLowerCase();
// "Special props should be updated as new props are added to components.
const specialProps      = ['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode', 'key'];
const isSpecialProp     = test => specialProps.includes(test);

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  props.id = props.key ? '' + props.key : getNextId();
  // TODO fix this
  if (props.key === 0) {
    console.warn(`Component key can't be '0' : ${type} ${props}`)
  }
  return {
    type, props, children: args.length ? flatten(args) : [], owner: null
  };
};

export const render = (component, hostNode, removeExisting = true) => {
  if (removeExisting) {
    removeAllElements(hostNode);
  }
  currentHostTree = createInitialComponentVDOM(component);
  updateElement(hostNode, currentHostTree);
  $hostNode = hostNode;
  performDidMountQueue();
};

//------------------------------------------------------------------------------
//CREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATI
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree of just html
const createInitialComponentVDOM = node => {
  node = cloneNode(node);
  if (typeof node === 'object') {
    if (typeof node.type === 'function') {
      node = renderComponentNode(instantiateNewComponent(node));
    }
    node.children = renderChildFunctions(node.children).map(createInitialComponentVDOM);
  } else if (typeof node === 'function') {
    console.warn(`createComponentVDOM : node is a function`, node);
  }
  return node;
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
const renderChildFunctions = childArry => {
  let result      = [],
      resultIndex = [];
  childArry.forEach((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();
      result.unshift(childResult);
      resultIndex.unshift(i);
    }
  });
  resultIndex.forEach((idx, i) => {
    childArry.splice(idx, 1, ...result[i]);
  });
  return childArry;
};

const instantiateNewComponent = node => {
  let instance;
  if (componentInstanceMap.hasOwnProperty(node.props.id)) {
    instance = componentInstanceMap[node.props.id];
  } else {
    instance                            = new node.type(node.props, node.children);
    componentInstanceMap[node.props.id] = instance;
  }
  return instance;
};

const renderComponentNode = instance => {
  if (typeof instance.render === 'function') {
    let node      = instance.render();
    instance.vdom = node;
    node.owner    = instance;
    return node;
  } else {
    // Stateless functional component
    if (isVDOMNode(instance)) {
      return instance;
    }
    console.warn(`renderComponentNode : No render() on instance`);
    return null;
  }
};

//------------------------------------------------------------------------------
//UPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESU
//------------------------------------------------------------------------------

const changed = (newNode, oldNode) => {
  return typeof newNode !== typeof oldNode ||
    (typeof newNode === 'string' || typeof newNode === 'number' || typeof newNode === 'boolean') && newNode !== oldNode ||
    newNode.type !== oldNode.type
};

const updateElement = ($hostNode, newNode, oldNode, index = 0) => {
  if (oldNode !== 0 && !oldNode) {
    $hostNode.appendChild(
      createElement(newNode)
    );
  } else if (!newNode) {
    let $child = $hostNode.childNodes[index];
    if ($child) {
      removeComponentInstance(oldNode);
      $hostNode.removeChild($child);
    }
  } else if (changed(newNode, oldNode)) {
    // TODO need to test for a component and fix this!
    $hostNode.replaceChild(
      createElement(newNode),
      $hostNode.childNodes[index]
    );
  } else if (newNode.type) {
    updateProps(
      $hostNode.childNodes[index],
      newNode.props,
      oldNode.props
    );
    const newLength = newNode.children.length;
    const oldLength = oldNode.children.length;
    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateElement($hostNode.childNodes[index], newNode.children[i], oldNode.children[i], i);
    }
  }
};

// TODO what if about component children of components?
const removeComponentInstance = (node) => {
  if (hasOwnerComponent(node)) {
    let id = node.owner.props.id;
    if (node.owner === componentInstanceMap[id]) {
      if (typeof componentInstanceMap[id].componentWillUnmount === 'function') {
        componentInstanceMap[id].componentWillUnmount();
      }

      removeEvents(node.owner.vdom.props.id);
      delete componentInstanceMap[id];
    }
  }
};

//------------------------------------------------------------------------------
//STATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATES
//------------------------------------------------------------------------------app

// Queue updates from components and batch update every so often
export const enqueueUpdate = (id) => {
  enqueueDidUpdate(id);
  if (!updateTimeOut) {
    updateTimeOut = setTimeout(performUpdates, 10);
  }
};

const performUpdates = () => {
  let updatedVDOMTree = currentHostTree; //createInitialComponentVDOM(currentHostTree);
  clearTimeout(updateTimeOut);
  updateTimeOut = null;
  getDidUpdateQueue().forEach(id => {
    updatedVDOMTree = updateComponentVDOM(updatedVDOMTree, id);
  });
  updateElement($hostNode, updatedVDOMTree, currentHostTree);
  currentHostTree = updatedVDOMTree;
  performDidMountQueue();
  performDidUpdateQueue(componentInstanceMap);
};

// Rerenders the components from id down to a vdom tree for diffing w/ the original
const updateComponentVDOM = (node, id) => {
  node = cloneNode(node);
  if (typeof node === 'object') {
    if (hasOwnerComponent(node) && node.owner.props.id === id) {
      let instance;
      if (componentInstanceMap.hasOwnProperty(id)) {
        instance = componentInstanceMap[id]
      } else {
        console.warn(`updateComponentVDOM : ${id} hasn't been created`);
        return node;
      }
      node = renderComponentNode(instance);
    } else if (typeof node.type === 'function') {
      // During the update of a parent node, a new component has been added to the child
      node = createInitialComponentVDOM(node);
    }
    node.children = renderChildFunctions(node.children).map(child => updateComponentVDOM(child, id));
  }

  return node;
};

/*
______________ ______________ ________   ________      _____      ________________________ _________________________
\__    ___/   |   \_   _____/ \______ \  \_____  \    /     \    /   _____/\__    ___/    |   \_   _____/\_   _____/
  |    | /    ~    \    __)_   |    |  \  /   |   \  /  \ /  \   \_____  \   |    |  |    |   /|    __)   |    __)
  |    | \    Y    /        \  |    `   \/    |    \/    Y    \  /        \  |    |  |    |  / |     \    |     \
  |____|  \___|_  /_______  / /_______  /\_______  /\____|__  / /_______  /  |____|  |______/  \___  /    \___  /
                \/        \/          \/         \/         \/          \/                         \/         \/

ALL THE THINGS THAT TOUCH THE DOM
 */

const createElement = node => {
  let $element,
      ownerComp = node.owner !== null && node.owner !== undefined ? node.owner : null;

  // This shouldn't happen ... but just in case ...
  if (node == null || node == undefined) {
    console.warn(`createElement: Error, ${node} was undefined`);
    return document.createTextNode(`createElement: Error, ${node} was undefined`);
  }

  if (typeof node === 'string' || typeof node === 'number') {
    // Plain value of a tag
    $element = document.createTextNode(node);
  } else if (typeof node.type === 'function') {
    // Stateless functional component
    $element = createElement(new node.type(node.props, node.children));
  } else if (typeof node === 'object' && typeof node.type === 'string') {
    $element = document.createElement(node.type);
    if (node.hasOwnProperty('children')) {
      node.children
        .map(createElement)
        .forEach($element.appendChild.bind($element));
    }
  } else if (typeof node === 'function') {
    return document.createTextNode('createElement : expected vdom, node is a function', node);
  } else {
    return document.createTextNode(`createElement: Unknown node type ${node} : ${node.type}`);
  }

  if (ownerComp) {
    ownerComp.current = $element;
    if (typeof ownerComp.componentDidMount === 'function') {
      enqueueDidMount(ownerComp.componentDidMount.bind(ownerComp));
    }
  }

  setProps($element, node.props || {});
  setEvents(node, $element);

  return $element;
};

//------------------------------------------------------------------------------
//EVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTSEVENTS
//------------------------------------------------------------------------------

const setEvents = (node, $element) => {
  const props = node.props || {};
  mapActions(props).forEach(evt => {
    if (evt.type === 'event') {
      const nodeId        = node.props.id;
      evt.internalHandler = handleEventTrigger(evt, $element);
      $element.addEventListener(evt.event, evt.internalHandler);
      if (!eventMap.hasOwnProperty(nodeId)) {
        eventMap[nodeId] = [];
      }
      eventMap[nodeId].push(() => $element.removeEventListener(evt.event, evt.internalHandler));
    }
  });
};

const mapActions = props => Object.keys(props).reduce((acc, key) => {
  let value = props[key],
      evt   = isEvent(key) ? getEventName(key) : null;

  if (evt !== null) {
    acc.push({
      type           : 'event',
      event          : evt,
      externalHandler: value,
      internalHandler: null
    });
  }
  return acc;
}, []);

const removeEvents = id => {
  if (eventMap.hasOwnProperty(id)) {
    eventMap[id].map(fn => {
      fn();
      return null;
    });
    delete eventMap[id];
  }
};

const handleEventTrigger = (evt, $element) => e => evt.externalHandler(createEventObject(e, $element));

const createEventObject = (e, $element = null) => ({
  event : e,
  target: $element
});

//------------------------------------------------------------------------------
//PROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPRO
//------------------------------------------------------------------------------

const updateProp = ($element, key, newValue, oldVaue) => {
  if (!newValue) {
    removeProp($element, key, oldVaue);
  } else if (!oldVaue || newValue !== oldVaue) {
    setProp($element, key, newValue);
  }
};

const updateProps = ($element, newProps, oldProps = {}) => {
  let props = Object.assign({}, newProps, oldProps);
  Object.keys(props).forEach(key => {
    updateProp($element, key, newProps[key], oldProps[key]);
  });
};

const setProps = ($element, props) => Object.keys(props).forEach(key => {
  let value = props[key];
  setProp($element, key, value);
  return $element;
});

const setProp = ($element, key, value) => {
  if (!isSpecialProp(key) && !isEvent(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id' && value.indexOf('element-id-') === 0) {
      // Disabled, it's too noisy
      // key = 'data-nid';
      return;
    }
    if (typeof value === 'boolean') {
      setBooleanProp($element, key, value);
    } else {
      $element.setAttribute(key, value);
    }
  }
};

const setBooleanProp = ($element, key, value) => {
  if (value) {
    $element.setAttribute(key, value);
    $element[key] = true;
  } else {
    $element[key] = false;
  }
};

const removeProp = ($element, key, value) => {
  if (!isSpecialProp(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }

    if (typeof value === 'boolean') {
      removeBooleanProp($element, key);
    } else {
      $element.removeAttribute(key);
    }
  }
};

const removeBooleanProp = ($element, key) => {
  $element.removeAttribute(key);
  $element[key] = false;
};