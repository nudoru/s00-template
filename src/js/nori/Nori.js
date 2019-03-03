/*
TODO
  - create a blinker, props update tester w/ css
  - simplify NoriComponent constructor - just take props
    - but children on props
    - "regular HTML" is an new element class
  - test props on SFC
  - test component children on SFC
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
import {patch} from './NoriDOM';
import {compose} from 'ramda';

const STAGE_UNITIALIZED = 'uninitialized';
const STAGE_RENDERING   = 'rendering';
const STAGE_UPDATING    = 'updating';
const STAGE_STEADY      = 'steady';

const UPDATE_TIMEOUT = 10;

let currentHostTree,
    componentInstanceMap = {},
    updateTimeOut,
    currentStage         = STAGE_UNITIALIZED;

const isVDOMNode        = vnode => typeof vnode === 'object' && vnode.hasOwnProperty('type') && vnode.hasOwnProperty('props') && vnode.hasOwnProperty('children');
const cloneNode         = vnode => cloneDeep(vnode); // Warning: Potentially expensive
const hasOwnerComponent = vnode => vnode.hasOwnProperty('owner') && vnode.owner !== null;
const getKeyOrId        = vnode => vnode.props.key ? vnode.props.key : vnode.props.id;

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
export const h = (type, props, ...args) => ({
  type,
  props   : props || {},
  children: args.length ? flatten(args) : [],
  owner   : null
});

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

  //console.time('update');
  clearTimeout(updateTimeOut);
  updateTimeOut = null;

  currentStage        = STAGE_RENDERING;
  let updatedVDOMTree = getCurrentHostTree();

  //TODO FOPT
  getDidUpdateQueue().forEach(id => {
    updatedVDOMTree = updateComponentVDOM(id)(updatedVDOMTree);
  });
  patch(updatedVDOMTree, getCurrentHostTree());
  setCurrentHostTree(updatedVDOMTree);

  performDidMountQueue();

  currentStage = STAGE_UPDATING;
  performDidUpdateQueue(componentInstanceMap);
  currentStage = STAGE_STEADY;
  //console.timeEnd('update');
};

//------------------------------------------------------------------------------
//CREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATI
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree for the first render of a component or tree
const renderComponentVDOM = vnode => {
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

  //TODO FOPT
  // can use reduce and acc for result index?
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
    instance                 = new vnode.type(vnode.props, vnode.children);
    id                       = instance.props.id;
    componentInstanceMap[id] = instance;
  } else if (vnode.hasOwnProperty('owner')) {
    instance                 = vnode.owner;
    id                       = instance.props.id;
    componentInstanceMap[id] = instance;
  } else {
    console.warn(`instantiateNewComponent : vnode is not component type`, typeof vnode.type, vnode);
  }
  return instance;
};

const renderComponentNode = instance => {
  if (typeof instance.internalRender === 'function') {
    let vnode   = instance.internalRender();
    vnode.owner = instance;
    return vnode;
  } else if (isVDOMNode(instance)) {
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