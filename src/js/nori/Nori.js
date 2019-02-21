import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {getNextId} from "./util/ElementIDCreator";
import {isDomEvent, domEventsList} from "./events/DomEvents";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

const ACTION_EVENT    = 'event';
const ACTION_BEHAVIOR = 'behavior';

let currentHostTree,
    $hostNode,
    componentInstanceMap = {},
    didMountQueue        = [],
    didUpdateQueue       = [],
    updateTimeOut,
    eventMap = {};

const BEHAVIORS = [];

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  props.id = props.key ? '' + props.key : getNextId();

  // TODO fix this
  if (props.key === 0) {
    console.warn(`Component key can't be '0' : ${type} ${props}`)
  }

  let vdomNode = {
    type, props, children: args.length ? flatten(args) : [], owner: null
  };

  return vdomNode;
};

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

/*
Renders out components to get a vdom tree of just html
 */
const createComponentVDOM = node => {
  if (typeof node === 'object') {
    node = Object.assign({}, node);
  }
  if (typeof node.type === 'function') {
    node = renderComponentNode(instantiateNewComponent(node));
  }
  if (node.hasOwnProperty('children')) {
    node.children = node.children.map(child => {
      return createComponentVDOM(child);
    });
  }
  return node;
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
    let node          = instance.render();
    instance.vdom = node;
    node.owner    = instance;
    return node;
  } else {
    console.warn(`renderComponentNode : No render() on instance`)
    return null;
  }
};

const createElement = node => {
  let $el,
      ownerComp = node.owner !== null && node.owner !== undefined ? node.owner : null;

  // This shouldn't happen ... but just in case ...
  if (node == null || node == undefined) {
    console.warn(`createElement: Error, ${node} was undefined`);
    return document.createTextNode(`createElement: Error, ${node} was undefined`);
  }

  if (typeof node === 'string' || typeof node === 'number') {
    // Plain value of a tag
    $el = document.createTextNode(node);
  } else if (typeof node.type === 'function') {
    // Stateless functional component
    $el = createElement(new node.type(node.props, node.children));
  } else if (typeof node === 'object' && typeof node.type === 'string') {
    $el = document.createElement(node.type);
    if (node.hasOwnProperty('children')) {
      node.children
        .map(createElement)
        .forEach($el.appendChild.bind($el));
    } else {
      // This shouldn't happen ...
    }

  } else if (typeof node === 'function') {
    console.log('node is a function', node);
    return;
  } else {
    return document.createTextNode(`createElement: Unknown node type ${node} : ${node.type}`);
  }

  if (ownerComp) {
    ownerComp.current = $el;
    didMountQueue.push(ownerComp.componentDidMount.bind(ownerComp));
  }

  setProps($el, node.props || {});
  setEvents(node, $el);

  return $el;
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

const setEvents = (node, $element) => {
  const props = node.props || {};

  mapActions(props).forEach(evt => {
    if (evt.type === ACTION_EVENT) {
      const nodeId = node.props.id;
      evt.internalHandler = handleEventTrigger(evt, $element);
      $element.addEventListener(evt.event, evt.internalHandler);
      if(!eventMap.hasOwnProperty(nodeId)) {
        eventMap[nodeId] = [];
      }
      eventMap[nodeId].push(() => $element.removeEventListener(evt.event, evt.internalHandler));
    }
  });
};

const mapActions = props => Object.keys(props).reduce((acc, key) => {
  let value      = props[key],
      domEvt     = isDomEvent(key),
      actionType = domEvt ? ACTION_EVENT : ACTION_BEHAVIOR;

  if (domEvt || BEHAVIORS.includes(key)) {
    acc.push({
      type           : actionType,
      event          : key,
      externalHandler: value,
      internalHandler: null
    });
  }
  return acc;
}, []);

const removeEvents = id => {
  if(eventMap.hasOwnProperty(id)) {
    eventMap[id].map(fn => {
      fn();
      return null;
    });
    delete eventMap[id];
  }
};

const handleEventTrigger = (evt, $src) => e => evt.externalHandler(createEventObject(e, $src));

const createEventObject = (e, $src = null) => ({
  event : e,
  target: $src
});

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

const changed = (newNode, oldNode) => {
  // console.log('changed',newNode, oldNode);
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
      removeComponentInstance(oldNode, $child);
      $hostNode.removeChild($child);
    }
  } else if (changed(newNode, oldNode)) {
    // TODO need to test for a component and fix this!
    // console.log('Replacing', oldNode, 'with', newNode);
    $hostNode.replaceChild(
      createElement(newNode),
      $hostNode.childNodes[index]
    );
  } else if (newNode.type) {
    //console.log('NO', oldNode, 'with', newNode);
    updateProps(
      $hostNode.childNodes[index],
      newNode.props,
      oldNode.props
    );

    // TODO replace for loop
    const newLength = newNode.children.length;
    const oldLength = oldNode.children.length;
    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateElement(
        $hostNode.childNodes[index],
        newNode.children[i],
        oldNode.children[i],
        i
      );
    }
  }
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

// "Special props should be updated as new props are added to components. This is a bad design
const specialProps = domEventsList.concat(['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode']);

const $isSpecialProp = test => specialProps.includes(test);

const updateProp = (element, key, newValue, oldVaue) => {
  if (!newValue) {
    removeProp(element, key, oldVaue);
  } else if (!oldVaue || newValue !== oldVaue) {
    setProp(element, key, newValue);
  }
};

export const updateProps = (element, newProps, oldProps = {}) => {
  let props = Object.assign({}, newProps, oldProps);
  Object.keys(props).forEach(key => {
    updateProp(element, key, newProps[key], oldProps[key]);
  });
};

export const setProps = (element, props) => Object.keys(props).forEach(key => {
  let value = props[key];
  setProp(element, key, value);
  return element;
});

export const setProp = (element, key, value) => {
  if (!$isSpecialProp(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }
    if (typeof value === 'boolean') {
      setBooleanProp(element, key, value);
    } else {
      element.setAttribute(key, value);
    }
  }
};

export const setBooleanProp = (element, key, value) => {
  if (value) {
    element.setAttribute(key, value);
    element[key] = true;
  } else {
    element[key] = false;
  }
};

export const removeProp = (element, key, value) => {
  if (!$isSpecialProp(key)) {
    if (key === 'className') {
      key = 'class';
    } else if (key === 'id') {
      key = 'data-nid';
    }

    if (typeof value === 'boolean') {
      removeBooleanProp(element, key);
    } else {
      element.removeAttribute(key);
    }
  }
};

export const removeBooleanProp = (element, key) => {
  element.removeAttribute(key);
  element[key] = false;
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

// Render a component to a dom node
export const render = (component, hostNode, removeExisting = true) => {
  if (removeExisting) {
    removeAllElements(hostNode);
  }

  currentHostTree = createComponentVDOM(component);
  updateElement(hostNode, currentHostTree);
  $hostNode = hostNode;
  performDidMountQueue();
};

const performDidMountQueue = () => {
  didMountQueue.forEach(fn => fn());
  didMountQueue = [];
};

const performDidUpdateQueue = () => {
  didUpdateQueue.forEach(id => {
    componentInstanceMap[id].componentDidUpdate()
  });
  didUpdateQueue = [];
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

/*
Queue updates from components and batch update every so often
 */
export const enqueueUpdate = (id) => {
  didUpdateQueue.push(id);
  if (!updateTimeOut) {
    updateTimeOut = setTimeout(performUpdates, 10);
  }
};

export const performUpdates = () => {
  let updatedVDOMTree;
  clearTimeout(updateTimeOut);
  updateTimeOut = null;
  didUpdateQueue.forEach(id => {
    updatedVDOMTree = rerenderVDOMInTree(currentHostTree, id);
  });
  updateElement($hostNode, updatedVDOMTree, currentHostTree);
  currentHostTree = updatedVDOMTree;
  performDidMountQueue();
  performDidUpdateQueue();
};

/*
Rerenders the components from id down to a vdom tree for diffing w/ the original
TODO, reconcile any over laps with createComponentVDOM
 */
const rerenderVDOMInTree = (node, id) => {
  if (typeof node === 'object') {
    node = Object.assign({}, node);
  }
  if (nodeHasOwnerComponent(node) && node.owner.props.id === id) {
    let instance;
    if (componentInstanceMap.hasOwnProperty(id)) {
      instance = componentInstanceMap[id]
    } else {
      console.warn(`rerenderVDOMInTree : ${id} isn't in the map!`);
      return node;
    }
    node = renderComponentNode(instance);
  } else if (node.hasOwnProperty('type') && typeof node.type === 'function') {
    // During the update of a parent node, a new component has been added to the children
    node = createComponentVDOM(node);
  }
  if (node.hasOwnProperty('children')) {
    node.children = node.children.map(child => {
      return rerenderVDOMInTree(child, id);
    });
  }
  return node;
};

const nodeHasOwnerComponent = node => node.hasOwnProperty('owner') && node.owner !== null;

// TODO what if about component children of components?
const removeComponentInstance = (node, $el) => {
  if(nodeHasOwnerComponent(node)) {
    if(node.owner === componentInstanceMap[node.owner.props.id]) {
      componentInstanceMap[node.owner.props.id].componentWillUnmount();
      removeEvents(node.owner.vdom.props.id);
      delete componentInstanceMap[node.owner.props.id];
    }
  }
};