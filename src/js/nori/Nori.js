/*
TODO
  - if there is a key value, set the dom element ID?
  - Element or wrapper for text nodes
  - use ImmutableJS data structures
  - test fn as prop value
  - test my mouse renderprops
  - what happens if an update is enququed while the update loop is updating vdom?
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
import {patch, removeEvents, applyPatch} from './NoriDOM';
import {diff} from 'deep-diff';

let currentHostTree,
    componentInstanceMap = {},
    updateTimeOut;

export const isNoriComponent    = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';
export const setCurrentHostTree = tree => currentHostTree = tree;
export const getCurrentHostTree = _ => cloneNode(currentHostTree);
const isVDOMNode                = node => typeof node === 'object' && node.hasOwnProperty('type') && node.hasOwnProperty('props') && node.hasOwnProperty('children');
const cloneNode                 = node => cloneDeep(node); // Warning: Potentially expensive
const hasOwnerComponent         = node => node.hasOwnProperty('owner') && node.owner !== null;

const STAGE_UNITIALIZED = 'uninitialized';
const STAGE_RENDERING = 'rendering';
const STAGE_UPDATING = 'updating';
const STAGE_STEADY = 'steady';

let currentStage = STAGE_UNITIALIZED;

export const isInitialized  = _ => currentStage !== STAGE_UNITIALIZED;
export const isRendering = _ => currentStage === STAGE_RENDERING;
export const isUpdating = _ => currentStage === STAGE_UPDATING;
export const isSteady = _ => currentStage === STAGE_STEADY;

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props = props || {};
  // TODO fix this
  if (props.key === 0) {
    console.warn(`Component key can't be '0' : ${type} ${props}`)
  }
  return {
    type, props, children: args.length ? flatten(args) : [], owner: null
  };
};

// Called from NoriDOM to render the first vdom
export const renderVDOM = node => {
  currentStage = STAGE_RENDERING;
  const vdom = renderComponentVDOM(node);
  setCurrentHostTree(vdom);
  currentStage = STAGE_STEADY;
  return vdom;
};

//------------------------------------------------------------------------------
//STATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATESTATEUPDATES
//------------------------------------------------------------------------------

// Queue updates from components and batch update every so often
// Called from NoriComponent set state
export const enqueueUpdate = (id) => {
  enqueueDidUpdate(id);
  if (!updateTimeOut) {
    updateTimeOut = setTimeout(performUpdates, 10);
  }
};

const performUpdates = () => {
  if(isRendering()) {
    console.log(`>>> Update called while rendering`);
    return;
  }

  // console.time('update');
  clearTimeout(updateTimeOut);
  updateTimeOut = null;

  currentStage = STAGE_RENDERING;
  let updatedVDOMTree = getCurrentHostTree();
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
    node = renderComponentNode(instantiateNewComponent(node));
    node.children = renderChildFunctions(node).map(child => renderComponentVDOM(child));
  }
  return node;
};

// Updates the vdom rerendering only the nodes that match an id
const updateComponentVDOM = (node, id) => {
  node = cloneNode(node);
  if (typeof node === 'object') {
    if (hasOwnerComponent(node) && node.owner.props.id === id) { //
      //console.log(`Updating ${node.owner.props.id}`, node);
      node = renderComponentNode(instantiateNewComponent(node)); // node
    } else if (typeof node.type === 'function') {
      console.log('New component', node);
      node = renderComponentVDOM(node); // new component added
    }
    node.children = renderChildFunctions(node).map(child => updateComponentVDOM(child, id));
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

const getNodeKeyOrID = node => node.props.key ? '' + node.props.key : node.props.id;

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

// const instantiateNewComponent = node => {
//   const ID = getNodeKeyOrID(node);
//   if (componentInstanceMap.hasOwnProperty(ID)) {
//     console.log(`instantiateNewComponent : REUSE ${node.props.id} ${getNodeKeyOrID(node)}`);
//     return componentInstanceMap[ID];
//   } else if(typeof node.type === 'function') {
//     console.log(`instantiateNewComponent : CREATE ${ID}`);
//     let instance                            = new node.type(node.props, node.children);
//     componentInstanceMap[ID] = instance;
//     return instance;
//   } else if (hasOwnerComponent(node)) {
//     console.log('node has an owner',ID, node);
//     console.log('>>>> ',componentInstanceMap.hasOwnProperty(ID));
//     return node.owner;
//   }
//   console.log(`instantiateNewComponent : NODE? `,node);
//
//   return node;
// };


const renderComponentNode = instance => {
  if (typeof instance.internalRender === 'function') {
    let node = instance.internalRender();
    // Assign the instance id on to the node if it didn't have one
    if (!node.props.hasOwnProperty('id') || node.props.id.indexOf('element-id-') === 0) {
      node.props.id = instance.props.id;
    }
    node.children.forEach((child, i) => {
      if (typeof child === 'object' && !child.props.id) {
        child.props.id = child.props.id ? child.props.id : node.props.id + `.${i}`;
      }
    });
    instance.vdom = node;
    node.owner    = instance;
    return node;
  } else if (isVDOMNode(instance)) {
    // SFC
    if (!instance.props.id) {
      // instance.props.id = nodeIDorKey(instance)
      instance.props.id = instance.props.key ? '' + instance.props.key : getNextId();
    }
    return instance;
  } else {
    console.warn(`renderComponentNode : No render() on instance`);
    return null;
  }
};

//------------------------------------------------------------------------------
//UPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESUPDATESU
//------------------------------------------------------------------------------

// TODO what if about component children of components?
export const removeComponentInstance = (node) => {
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