import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";
import {setEvents} from "./Eventing";
import {getNextId} from "./util/ElementIDCreator";
import {domEventsList} from "./events/DomEvents";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

let lastHostTree,
    $hostNode,
    componentInstanceMap = {},
    didMountQueue        = [],
    didUpdateQueue       = [],
    updateTimeOut;

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  props.id = props.key || getNextId();

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
    let instance                        = new node.type(node.props, node.children);
    componentInstanceMap[node.props.id] = instance;
    if (typeof instance.render === 'function') {
      node       = instance.render();
      node.owner = instance;
    }
  }
  if (node.hasOwnProperty('children')) {
    node.children = node.children.map(child => {
      let res = createComponentVDOM(child);
      return res;
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
    node.children
      .map(createElement)
      .forEach($el.appendChild.bind($el));
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
    if(child) {
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

  lastHostTree = createComponentVDOM(component);

  updateElement(hostNode, lastHostTree);

  $hostNode = hostNode;

  didMountQueue.forEach(fn => fn());
  didMountQueue = [];
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
    updatedVDOMTree = rerenderVDOMInTree(lastHostTree, componentInstanceMap, id);
  });

  updateElement($hostNode, updatedVDOMTree, lastHostTree);
  lastHostTree = updatedVDOMTree;

  didUpdateQueue.forEach(id => {
    // try catch in case the comp had been removed
    // try {
      componentInstanceMap[id].componentDidUpdate()
    // } catch (e) {
    //   console.warn(`performUpdates, cdu: WTF? ${e}`);
    // }
  });
  didUpdateQueue = [];
};

/*
Rerenders the components from id down to a vdom tree for diffing w/ the original
TODO, reconcile any over laps with createComponentVDOM
 */
const rerenderVDOMInTree = (node, componentInstanceMap, id) => {
  if (typeof node === 'object') {
    node = Object.assign({}, node);
  }
  if (node.owner !== null) {
    if (node.hasOwnProperty('owner') && node.owner.props.id === id) {
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
    }
    if (node.hasOwnProperty('children')) {
      node.children = node.children.map(child => {
        let res = rerenderVDOMInTree(child, componentInstanceMap, id);
        return res;
      });
    }
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