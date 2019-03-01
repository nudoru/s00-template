/*
TODO
  - Element or wrapper for text nodes
  - use ImmutableJS data structures
  - test fn as prop value
  - test my mouse renderprops
  - in component constructor, call super w/ only props
  - Memoize? https://blog.javascripting.com/2016/10/05/building-your-own-react-clone-in-five-easy-steps/
 */


import {flatten} from "./util/ArrayUtils";
import {getNextId} from "./util/ElementIDCreator";
import {cloneDeep} from 'lodash';
import {
  enqueueDidUpdate,
  getDidUpdateQueue,
  performDidMountQueue,
  performDidUpdateQueue
} from './LifecycleQueue';
import {patch, removeEvents} from './NoriDOM';

const STAGE_UNITIALIZED = 'uninitialized';
const STAGE_RENDERING   = 'rendering';
const STAGE_UPDATING    = 'updating';
const STAGE_STEADY      = 'steady';

const UPDATE_TIMEOUT = 1;

let currentHostTree,
    componentInstanceMap = {},
    updateTimeOut,
    currentStage         = STAGE_UNITIALIZED;

const isVDOMNode        = node => typeof node === 'object' && node.hasOwnProperty('type') && node.hasOwnProperty('props') && node.hasOwnProperty('children');
const cloneNode         = node => cloneDeep(node); // Warning: Potentially expensive
const hasOwnerComponent = node => node.hasOwnProperty('owner') && node.owner !== null;

export const isNoriComponent    = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';
export const setCurrentHostTree = tree => currentHostTree = tree;
export const getCurrentHostTree = _ => cloneNode(currentHostTree);
export const isInitialized      = _ => currentStage !== STAGE_UNITIALIZED;
export const isRendering        = _ => currentStage === STAGE_RENDERING;
export const isUpdating         = _ => currentStage === STAGE_UPDATING;
export const isSteady           = _ => currentStage === STAGE_STEADY;

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props = props || {};
  return {
    type, props, children: args.length ? flatten(args) : [], owner: null
  };
};

// Called from NoriDOM to render the first vdom
export const renderVDOM = node => {
  currentStage = STAGE_RENDERING;
  const vdom   = renderComponentVDOM(node);
  setCurrentHostTree(vdom);
  currentStage = STAGE_STEADY;
  return vdom;
};

//------------------------------------------------------------------------------
//STATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATES
//------------------------------------------------------------------------------

// Queue updates from components and batch update every so often
// Called from NoriComponent set state
export const enqueueUpdate = id => {
  enqueueDidUpdate(id);
  if (!updateTimeOut) {
    updateTimeOut = setTimeout(performUpdates, UPDATE_TIMEOUT);
  }
};

const performUpdates = () => {
  if (isRendering()) {
    console.log(`>>> Update called while rendering`);
    return;
  }

  // console.time('update');
  clearTimeout(updateTimeOut);
  updateTimeOut = null;

  currentStage        = STAGE_RENDERING;
  let updatedVDOMTree = getCurrentHostTree();

  //TODO FOPT
  getDidUpdateQueue().forEach(id => {
    updatedVDOMTree = updateComponentVDOM(updatedVDOMTree, id);
  });
  patch(updatedVDOMTree, getCurrentHostTree());

  setCurrentHostTree(updatedVDOMTree);
  performDidMountQueue();

  currentStage = STAGE_UPDATING;
  performDidUpdateQueue(componentInstanceMap);
  // console.timeEnd('update');
  currentStage = STAGE_STEADY;
};

//------------------------------------------------------------------------------
//CREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATI
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree for the first render of a component or tree
const renderComponentVDOM = node => {
  node = cloneNode(node);
  if (typeof node === 'object' && typeof node.type === 'function') {
    node          = renderComponentNode(instantiateNewComponent(node));
    node.children = renderChildFunctions(node).map(child => renderComponentVDOM(child));
  }
  return node;
};

// Updates the vdom rerendering only the nodes that match an id
const updateComponentVDOM = (node, id) => {
  node = cloneNode(node);
  if (typeof node === 'object') {
    if (hasOwnerComponent(node) && node.owner.props.id === id) { //
      node = renderComponentNode(instantiateNewComponent(node)); // node
    } else if (typeof node.type === 'function') {
      node = renderComponentVDOM(node); // new component added
    }
    if (node.hasOwnProperty('children')) {
      node.children = renderChildFunctions(node).map(child => updateComponentVDOM(child, id));
    }
  }
  return node;
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const renderChildFunctions = node => {
  let children    = node.children,
      result      = [],
      resultIndex = [],
      index       = 0;

  //TODO FOPT
  children.forEach((child, i) => {
    if (typeof child === 'function') {
      let childResult = child(node);
      childResult.forEach((c, i) => {
        if (typeof c === 'object' && !c.props.id) {
          c.props.id = c.props.id ? c.props.id : node.props.id + `.${i}.${index++}`;
        }
      });
      result.unshift(childResult);
      resultIndex.unshift(i);
    }
  });
  resultIndex.forEach((idx, i) => {
    children.splice(idx, 1, ...result[i]);
  });
  return children;
};

const instantiateNewComponent = node => {
  if (componentInstanceMap.hasOwnProperty(node.props.id)) {
    return componentInstanceMap[node.props.id];
  }
  const instance                      = new node.type(node.props, node.children);
  componentInstanceMap[node.props.id] = instance;
  return instance;
};

const renderComponentNode = instance => {
  if (typeof instance.internalRender === 'function') {
    let vnode     = instance.internalRender();
    instance.vdom = vnode;
    vnode.owner   = instance;
    return vnode;
  } else if (isVDOMNode(instance)) {
    // SFC
    if (!instance.props.id) {
      instance.props.id = instance.props.key ? '' + instance.props.key : getNextId();
    }
    return instance;
  }
  console.warn(`renderComponentNode : No render() on instance`);
  return null;
};

export const removeComponentInstance = vnode => {
  if (hasOwnerComponent(vnode)) {
    if (typeof vnode.owner.componentWillUnmount === 'function') {
      vnode.owner.componentWillUnmount();
    }
    delete componentInstanceMap[vnode.owner.props.id];
  }
};