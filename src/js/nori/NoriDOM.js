import {enqueueDidMount, performDidMountQueue} from './LifecycleQueue';
import {removeComponentInstance, renderVDOM} from "./Nori";
import {removeAllElements} from "./browser/DOMToolbox";


const ID_KEY        = 'data-nori-id';
const isEvent       = event => /^on/.test(event);
const getEventName  = event => event.slice(2).toLowerCase();
// "Special props should be updated as new props are added to components.
const specialProps  = ['tweens', 'state', 'actions', 'children', 'element', 'min', 'max', 'mode', 'key'];
const isSpecialProp = test => specialProps.includes(test);

let eventMap = {},
    domElMap = {},
    $documentHostNode;

export const render = (component, hostNode) => {
  console.time('render');
  removeAllElements(hostNode);
  $documentHostNode = hostNode;
  const vdom        = renderVDOM(component);
  patch(vdom, null);
  // $documentHostNode.appendChild(createElement(vdom));
  performDidMountQueue();
  console.timeEnd('render');
};

const correlateVDOMNode = (vnode, $domRoot) => {
  if (!vnode) {
    return $domRoot;
  } else {
    const $element = document.querySelector(`[${ID_KEY}="${vnode.props.id}"]`);
    if (!$element) {
      console.warn(`correlateVDOMNode : Couldn't get [${ID_KEY}="${vnode.props.id}"]`);
    }
    return $element;
  }
};

export const patch = (newvdom, currentvdom) => {
  let patches = [];
  updateDOM($documentHostNode, newvdom, currentvdom, 0, patches);
  return patches;
};

const updateDOM = ($element, newvdom, currentvdom, index = 0, patches) => {
  if (currentvdom !== 0 && !currentvdom) {
    const $newElement = createElement(newvdom);
    $element.appendChild($newElement);
    console.log('Append', newvdom, $newElement);
    patches.push({
      type  : 'APPEND',
      node  : $newElement,
      parent: $element,
      vnode : newvdom
    });
  } else if (!newvdom) {
    const $toRemove = correlateVDOMNode(currentvdom, $element);
    if ($toRemove) {
      console.log('Remove', currentvdom, $toRemove);
      // removeComponentInstance(currentvdom);
      if(currentvdom.hasOwnProperty('props')) {
        removeEvents(currentvdom.props.id);
      }
      $element.removeChild($toRemove);
      patches.push({
        type  : 'REMOVE',
        node  : $toRemove,
        parent: $element,
        vnode : currentvdom
      });
    } else {
      console.warn(`wanted to remove`,currentvdom,`but it wasn't there`);
    }
  } else if (changed(newvdom, currentvdom)) {
    const $newElement = createElement(newvdom);
    if(newvdom.type) {
      console.log('Replace', newvdom, currentvdom, $newElement);
    }
    $element.replaceChild($newElement, $element.childNodes[index]);
    patches.push({
      type   : 'REPLACE',
      oldNode: $element.childNodes[index],
      node   : $newElement,
      parent : $element,
      vnode  : newvdom
    });
  } else if (newvdom.type) {
    updateProps(
      $element.childNodes[index],
      newvdom.props,
      currentvdom.props
    );
    const newLength = newvdom.children.length;
    const oldLength = currentvdom.children.length;
    const len = Math.max(newLength, oldLength);
    for (let i = 0; i < len; i++) {
      updateDOM($element.childNodes[index], newvdom.children[i], currentvdom.children[i], i, patches);
    }
  }
};

const changed = (newNode, oldNode) => {
  return typeof newNode !== typeof oldNode ||
    (typeof newNode === 'string' || typeof newNode === 'number' || typeof newNode === 'boolean') && newNode !== oldNode ||
    newNode.type !== oldNode.type
};

const createElement = node => {
  let $element,
      ownerComp = node.owner !== null && node.owner !== undefined ? node.owner : null;

  if (typeof node === 'string' || typeof node === 'number') {
    // Plain text value
    $element = createTextNode(node);
  } else if (typeof node.type === 'function') {
    // Stateless functional component
    $element = createElement(new node.type(node.props, node.children));
  } else if (typeof node === 'object' && typeof node.type === 'string') {

    //if(domElMap.hasOwnProperty(node.props.id)){
      //$element = domElMap[node.props.id];
      //console.log('recycling',$element);
    //} else {
      $element = document.createElement(node.type);
      if (node.hasOwnProperty('children')) {
        node.children
          .map(createElement)
          .forEach(child => $element.appendChild(child));
      }
      //domElMap[node.props.id] = $element;
    //}


  } else if (typeof node === 'function') {
    return createTextNode('createElement : expected vdom, node is a function', node);
  } else {
    return createTextNode(`createElement: Unknown node type ${typeof node} : ${node.type}`);
  }

  if (ownerComp) {
    ownerComp.current = $element;
    if (typeof ownerComp.componentDidMount === 'function') {
      enqueueDidMount(ownerComp.componentDidMount); //.bind(ownerComp)
    }
  }

  setProps($element, node.props || {});
  setEvents(node, $element);

  return $element;
};

const createTextNode = string => document.createTextNode(string);

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

const handleEventTrigger = (evt, $element) => e => evt.externalHandler(createEventObject(e, $element));

// Nori calls this
const removeEvents = id => {
  if (eventMap.hasOwnProperty(id)) {
    eventMap[id].map(fn => {
      fn();
      return null;
    });
    delete eventMap[id];
  }
};

const createEventObject = (e, $element = null) => ({
  event : e,
  target: $element
});

//------------------------------------------------------------------------------
//PROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPROPSPRO
//------------------------------------------------------------------------------

const updateProps = ($element, newProps, oldProps = {}) => {
  let props = Object.assign({}, newProps, oldProps);
  Object.keys(props).forEach(key => {
    updateProp($element, key, newProps[key], oldProps[key]);
  });
};

const updateProp = ($element, key, newValue, oldValue) => {
  if (!newValue) {
    removeProp($element, key, oldValue);
  } else if (!oldValue || newValue !== oldValue) {
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
    } else if (key === 'id') {
      key = ID_KEY;
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