import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {setEvents} from "./Eventing";
import {getNextId} from "./util/ElementIDCreator";
import {domEventsList} from "./events/DomEvents";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

let currentHostTree,
    $hostNode,
    componentInstanceMap = {},
    didMountQueue        = [],
    didUpdateQueue       = [],
    updateTimeOut;

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
    let instance;
    if (componentInstanceMap.hasOwnProperty(node.props.id)) {
      instance = componentInstanceMap[node.props.id];
    } else {
      instance                            = new node.type(node.props, node.children);
      componentInstanceMap[node.props.id] = instance;
    }
    if (typeof instance.render === 'function') {
      node       = instance.render();
      node.owner = instance;
    }
  }
  if (node.hasOwnProperty('children')) {
    node.children = node.children.map(child => {
      return createComponentVDOM(child);
    });
  }
  return node;
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
  setEvents(node.props, $el);

  return $el;
};

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
    let child = $hostNode.childNodes[index];
    // TODO need to remove events
    // instancemap[$hostnode['data-nid']].componentWillUnmount();
    if (child) {
      $hostNode.removeChild(child);
    }
  } else if (changed(newNode, oldNode)) {
    //console.log('Replacing', oldNode, 'with', newNode);
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

  // console.log(updatedVDOMTree);

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

  if (node.hasOwnProperty('owner') && node.owner !== null && node.owner.props.id === id) {
    let instance;
    if (componentInstanceMap.hasOwnProperty(id)) {
      instance = componentInstanceMap[id]
    } else {
      console.warn(`rerenderVDOMInTree : ${id} isn't in the map!`);
      return node;
    }
    if (typeof instance.render === 'function') {
      node       = instance.render();
      node.owner = instance;
    }
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

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

// export const removeChild = child => {
//   if (isNoriComponent(child)) {
//     child.remove();
//   }
// };
//
// export const removeChildren = children => children.forEach(removeChild);