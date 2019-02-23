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
  enqueueDidUpdate,
  getDidUpdateQueue,
  performDidMountQueue,
  performDidUpdateQueue
} from './LifecycleQueue';
import {createElement, updateProps, removeEvents} from './NoriDOM';

let currentHostTree,
    $hostNode,
    componentInstanceMap = {},
    updateTimeOut;

export const isNoriComponent = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';

const isVDOMNode        = node => typeof node === 'object' && node.hasOwnProperty('type') && node.hasOwnProperty('props') && node.hasOwnProperty('children');
const cloneNode         = node => cloneDeep(node); // Warning: Potentially expensive
const hasOwnerComponent = node => node.hasOwnProperty('owner') && node.owner !== null;

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
      // TODO can I get the ID a better way?
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
