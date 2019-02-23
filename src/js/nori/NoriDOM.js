import {enqueueDidMount, performDidMountQueue} from './LifecycleQueue';
import {
  createInitialComponentVDOM,
  removeComponentInstance,
  setCurrentHostTree
} from "./Nori";
import {removeAllElements} from "./browser/DOMToolbox";

let eventMap = {},
    $documentHostNode;

const isEvent       = event => /^on/.test(event);
const getEventName  = event => event.slice(2).toLowerCase();
// "Special props should be updated as new props are added to components.
const specialProps  = ['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode', 'key'];
const isSpecialProp = test => specialProps.includes(test);

/*
______________ ______________ ________   ________      _____      ________________________ _________________________
\__    ___/   |   \_   _____/ \______ \  \_____  \    /     \    /   _____/\__    ___/    |   \_   _____/\_   _____/
  |    | /    ~    \    __)_   |    |  \  /   |   \  /  \ /  \   \_____  \   |    |  |    |   /|    __)   |    __)
  |    | \    Y    /        \  |    `   \/    |    \/    Y    \  /        \  |    |  |    |  / |     \    |     \
  |____|  \___|_  /_______  / /_______  /\_______  /\____|__  / /_______  /  |____|  |______/  \___  /    \___  /
                \/        \/          \/         \/         \/          \/                         \/         \/

ALL THE THINGS THAT TOUCH THE DOM ...

 */

export const render = (component, hostNode) => {
  removeAllElements(hostNode);

  let vdom = createInitialComponentVDOM(component);

  setCurrentHostTree(vdom);
  $documentHostNode = hostNode;

  updateDOM($documentHostNode, vdom);
  performDidMountQueue();
};

export const patch = (newNode, oldNode) => {
    updateDOM($documentHostNode, newNode, oldNode)
};

export const updateDOM = ($element, newNode, oldNode, index = 0) => {
  if (oldNode !== 0 && !oldNode) {
    $element.appendChild(
      createElement(newNode)
    );
  } else if (!newNode) {
    let $child = $element.childNodes[index];
    if ($child) {
      removeComponentInstance(oldNode);
      $element.removeChild($child);
    }
  } else if (changed(newNode, oldNode)) {
    // TODO need to test for a component and fix this!
    $element.replaceChild(
      createElement(newNode),
      $element.childNodes[index]
    );
  } else if (newNode.type) {
    updateProps(
      $element.childNodes[index],
      newNode.props,
      oldNode.props
    );
    const newLength = newNode.children.length;
    const oldLength = oldNode.children.length;
    for (let i = 0; i < newLength || i < oldLength; i++) {
      updateDOM($element.childNodes[index], newNode.children[i], oldNode.children[i], i);
    }
  }
};

const changed = (newNode, oldNode) => {
  return typeof newNode !== typeof oldNode ||
    (typeof newNode === 'string' || typeof newNode === 'number' || typeof newNode === 'boolean') && newNode !== oldNode ||
    newNode.type !== oldNode.type
};

export const createElement = node => {
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

export const removeEvents = id => {
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

export const updateProps = ($element, newProps, oldProps = {}) => {
  let props = Object.assign({}, newProps, oldProps);
  Object.keys(props).forEach(key => {
    updateProp($element, key, newProps[key], oldProps[key]);
  });
};

const updateProp = ($element, key, newValue, oldVaue) => {
  if (!newValue) {
    removeProp($element, key, oldVaue);
  } else if (!oldVaue || newValue !== oldVaue) {
    setProp($element, key, newValue);
  }
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