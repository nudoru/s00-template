/*
TODO
  - context?
  - refs?
  - hooks?
  - spinner https://github.com/davidhu2000/react-spinners/blob/master/src/BarLoader.jsx
  - create a fn that will determine if the vnode has been rendered and call render or update as appropriate
  - test form input
  - Element or wrapper for text nodes?
  - use ImmutableJS data structures
  - test fn as prop value
  - test my mouse renderprops
  - in component constructor, call super w/ only props
  - Memoize? https://blog.javascripting.com/2016/10/05/building-your-own-react-clone-in-five-easy-steps/
 */

import Is from './util/is';
import {flatten} from "./util/ArrayUtils";
import {getNextId} from "./util/ElementIDCreator";
import {cloneDeep} from 'lodash';
import {
  enqueueDidUpdate,
  getDidUpdateQueue,
  performDidMountQueue,
  performDidUpdateQueue
} from './LifecycleQueue';
import {patch} from './NoriDOM';
import {compose} from 'ramda';
import NoriComponent from "./NoriComponent";

const STAGE_UNITIALIZED = 'uninitialized';
const STAGE_RENDERING   = 'rendering';
const STAGE_UPDATING    = 'updating';
const STAGE_STEADY      = 'steady';

const UPDATE_TIMEOUT = 10;  // how ofter the update queue runs

let currentVDOM,
    componentInstanceMap = {},
    updateTimeOut,
    currentStage         = STAGE_UNITIALIZED;

const isVDOMNode        = vnode => typeof vnode === 'object' && vnode.hasOwnProperty('type') && vnode.hasOwnProperty('props') && vnode.hasOwnProperty('children');
const cloneNode         = vnode => cloneDeep(vnode); // Warning: Potentially expensive
const hasOwnerComponent = vnode => vnode.hasOwnProperty('_owner') && vnode._owner !== null;
const getKeyOrId        = vnode => vnode.props.key ? vnode.props.key : vnode.props.id;

export const isNoriComponent         = vnode => Object.getPrototypeOf(vnode.type) === NoriComponent;
export const isNoriComponentInstance = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';
export const setCurrentVDOM          = tree => currentVDOM = tree;
export const getCurrentVDOM          = _ => cloneNode(currentVDOM);
export const isInitialized           = _ => currentStage !== STAGE_UNITIALIZED;
export const isRendering             = _ => currentStage === STAGE_RENDERING;
export const isUpdating              = _ => currentStage === STAGE_UPDATING;
export const isSteady                = _ => currentStage === STAGE_STEADY;

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => ({
  type,
  props   : props || {},
  children: args.length ? flatten(args) : [],
  _owner  : null // will be the NoriComponent instance that generated the node
});

// Called from NoriDOM to render the first vdom
export const renderVDOM = node => {
  currentStage = STAGE_RENDERING;
  const vdom   = renderComponentVDOM(node);
  setCurrentVDOM(vdom);
  currentStage = STAGE_STEADY;
  return vdom;
};

//------------------------------------------------------------------------------
//STATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATES
//------------------------------------------------------------------------------

// Queue updates from components and batch update every so often
// Called from NoriComponent set state
// TODO What about requestIdleCallback https://github.com/aFarkas/requestIdleCallback
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

  currentStage = STAGE_RENDERING;

  const updatedVDOMTree = getDidUpdateQueue().reduce((acc, id) => {
    acc = updateComponentVDOM(id)(acc);
    return acc;
  }, getCurrentVDOM());
  // TODO FOPT => get updatedVDOM tree to flow into patch and setCurrentVDOM
  patch(updatedVDOMTree, getCurrentVDOM());
  setCurrentVDOM(updatedVDOMTree);

  performDidMountQueue();

  currentStage = STAGE_UPDATING;
  performDidUpdateQueue(componentInstanceMap);
  currentStage = STAGE_STEADY;
  // console.timeEnd('update');
};

//------------------------------------------------------------------------------
//CREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATI
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree for the first render of a component or tree
export const renderComponentVDOM = vnode => {
  vnode = cloneNode(vnode);
  if (typeof vnode === 'object' && typeof vnode.type === 'function') {
    vnode          = compose(renderComponentNode, instantiateNewComponent)(vnode);
    vnode.children = renderChildFunctions(vnode).map(renderComponentVDOM);
  }
  return vnode;
};

// Updates the vdom rerendering only the nodes that match an id
const updateComponentVDOM = id => vnode => {
  vnode = cloneNode(vnode);
  if (typeof vnode === 'object') {
    if (hasOwnerComponent(vnode) && vnode.props.id === id) { //
      vnode = renderComponentNode(instantiateNewComponent(vnode));
    } else if (typeof vnode.type === 'function') {
      vnode = renderComponentVDOM(vnode); // new component added
    }
    if (vnode.hasOwnProperty('children')) {
      vnode.children = renderChildFunctions(vnode).map(updateComponentVDOM(id));
    }
  }
  return vnode;
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const renderChildFunctions = vnode => {
  let children    = vnode.children,
      result      = [],
      resultIndex = [],
      index       = 0;

  children = children.map((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();
      childResult = childResult.map((c, i) => {
        if (typeof c.type === 'function') {
          c = renderComponentVDOM(c);
        } else if (typeof c === 'object' && !getKeyOrId(c)) { //c.props.id
          c.props.id = c.props.id ? c.props.id : vnode.props.id + `.${i}.${index++}`;
        }
        return c;
      });
      result.unshift(childResult);
      resultIndex.unshift(i);
    } else {
      child = renderComponentVDOM(child);
    }
    return child;
  });
  resultIndex.forEach((idx, i) => {
    children.splice(idx, 1, ...result[i]);
  });
  return children;
};

const instantiateNewComponent = vnode => {
  let instance = vnode,
      id       = getKeyOrId(vnode);
  if (componentInstanceMap.hasOwnProperty(id)) {
    instance = componentInstanceMap[id];
  } else if (typeof vnode.type === 'function') {
    vnode.props.children     = Is.array(vnode.children) ? vnode.children : [vnode.children];
    instance                 = new vnode.type(vnode.props);
    if(isNoriComponent(vnode)) {
      // Only cache NoriComps, not SFCs
      id                       = instance.props.id; // id could change during construction
      componentInstanceMap[id] = instance;
    }
  } else if (vnode.hasOwnProperty('_owner')) {
    instance                 = vnode._owner;
    id                       = instance.props.id;
    componentInstanceMap[id] = instance;
  } else {
    console.warn(`instantiateNewComponent : vnode is not component type`, typeof vnode.type, vnode);
  }
  return instance;
};

const renderComponentNode = instance => {
  if (typeof instance.internalRender === 'function') {
    let vnode    = instance.internalRender();
    vnode._owner = instance;
    return vnode;
  } else if (isVDOMNode(instance)) {
    if (!instance.props.id) {
      instance.props.id = instance.props.key ? '' + instance.props.key : getNextId();
    }
    return instance;
  }
  return null;
};

export const removeComponentInstance = vnode => {
  if (hasOwnerComponent(vnode)) {
    if (typeof vnode._owner.componentWillUnmount === 'function') {
      vnode._owner.componentWillUnmount();
      vnode._owner.remove();
    }
    delete componentInstanceMap[vnode._owner.props.id];
  }
};