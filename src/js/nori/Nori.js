import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {setEvents} from "./Eventing";
import {getNextId} from "./util/ElementIDCreator";
import {domEventsList} from "./events/DomEvents";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

let lastHostTree,
    $hostNode,
    updatingHostTree,
    componentInstanceMap = {},
    didMountQueue        = [],
    didUpdateQueue    = [],
    updateTimeOut;

// Convenience method to create new components. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  props.id = props.key || getNextId();

  return {
    type, props, children: args.length ? flatten(args) : [], forceUpdate: false
  };
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

const createElement = node => {
  let $el;
  if (typeof node === 'string' || typeof node === 'number') {
    // Plain value of a tag
    $el = document.createTextNode(node);
  } else if (typeof node.type === 'function') {
    let instance,
        existingInstance = false;

    // If the instance has been flagged as updated (new prop on the map entry) rerender?
    if (componentInstanceMap.hasOwnProperty(node.props.id)) {
      instance         = componentInstanceMap[node.props.id];
      existingInstance = true;
    } else {
      instance                            = new node.type(node.props, node.children);
      componentInstanceMap[node.props.id] = instance;
    }

    if (typeof instance.render === 'function') {
      // Component
      // TODO set a reference in the component to the DOM node created here
      $el              = createElement(instance.render());
      instance.current = $el;
    } else {
      // Stateless functional component
      $el = createElement(instance);
    }

    if (typeof instance.componentDidMount === 'function' && !existingInstance) {
      didMountQueue.push(instance.componentDidMount.bind(instance));
    }
  } else if (typeof node === 'object' && typeof node.type === 'string') {
    // Normal tag
    $el = document.createElement(node.type);
    node.children
      .map(createElement)
      .forEach($el.appendChild.bind($el));
  } else {
    console.warn(`Unknown node type ${node} : ${node.type}`);
  }

  setProps($el, node.props || {});
  setEvents(node.props, $el);

  return $el;
};

const changed = (newNode, oldNode) => {
  if (newNode.forceUpdate) {
    return true;
  }
  return typeof newNode !== typeof oldNode ||
    typeof newNode === 'string' && newNode !== oldNode ||
    newNode.type !== oldNode.type
};

const updateElement = ($hostNode, newNode, oldNode, index = 0) => {

  if (!oldNode) {
    $hostNode.appendChild(
      createElement(newNode)
    );
  } else if (!newNode) {
    // TODO need to remove events
    $hostNode.removeChild(
      $hostNode.childNodes[index]
    );
  } else if (changed(newNode, oldNode)) {
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

  lastHostTree = component;
  $hostNode    = hostNode;

  updateElement(hostNode, component);

  didMountQueue.forEach(fn => fn());
  didMountQueue = [];
};

//------------------------------------------------------------------------------
//------------------------------------------------------------------------------
//------------------------------------------------------------------------------

export const enqueueUpdate = (id) => {
  didUpdateQueue.push(id);
  updatingHostTree = markForceUpdateVDOMInTree(lastHostTree, id);
  if (!updateTimeOut) {
    updateTimeOut = setTimeout(performUpdates, 10);
  }
};

export const performUpdates = () => {
  clearTimeout(updateTimeOut);
  updateTimeOut = null;

  updateElement($hostNode, updatingHostTree, lastHostTree);
  clearForceUpdateVDOMInTree(updatingHostTree);
  lastHostTree = updatingHostTree;

  didUpdateQueue.forEach(id => {
    // try catch in case the comp had been removed
    try {
      componentInstanceMap[id].componentDidUpdate()
    } catch (e) {}
  });
  didUpdateQueue = [];
};

const markForceUpdateVDOMInTree = (vdom, id) => {
  if (typeof vdom === 'object') {
    if (vdom.props.id === id) {
      vdom.forceUpdate = true;
    } else if (vdom.props.children) {
      vdom.props.children.forEach(child => markForceUpdateVDOMInTree(child, id));
    }
  }
  return vdom;
};

const clearForceUpdateVDOMInTree = (vdom) => {
  if (typeof vdom === 'object') {
    if (vdom.props.children) {
      vdom.forceUpdate = false;
      vdom.props.children.forEach(child => clearForceUpdateVDOMInTree(child));
    }
  }
  return vdom;
};

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

// export const removeChild = child => {
//   if (isNoriComponent(child)) {
//     child.remove();
//   }
// };
//
// export const removeChildren = children => children.forEach(removeChild);