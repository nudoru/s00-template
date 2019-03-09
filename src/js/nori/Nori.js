/*
TODO
  - HOOKS
    - move hooks to new files
    - how to separate currentVnode cursor
    - use hooks outside of render?
    - use hooks in SFC?
  - update lister with my usestate as a test
  - test render props pattern https://www.robinwieruch.de/react-render-props-pattern/
  - use this list to preinit common tags? https://www.npmjs.com/package/html-tags
    - ex: https://github.com/alex-milanov/vdom-prototype/blob/master/src/js/util/vdom.js#L190
    - // Super slick ES6 one liner factory function!
      const greetingFactory = (name) => Reflect.construct(Greeting, [name]);
  - throw errors and error boundaries
  - update props
  - memo components
  - pure components - no update if state didn't change
  - context?
  - refs?
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

let _currentVDOM,
    _currentVnode,
    _componentInstanceMap = {},
    _updateTimeOutID,
    _currentStage         = STAGE_UNITIALIZED;

const isVDOMNode        = vnode => typeof vnode === 'object' && vnode.hasOwnProperty('type') && vnode.hasOwnProperty('props') && vnode.hasOwnProperty('children');
const cloneNode         = vnode => cloneDeep(vnode); // Warning: Potentially expensive
const hasOwnerComponent = vnode => vnode.hasOwnProperty('_owner') && vnode._owner !== null;
const getKeyOrId        = vnode => vnode.props.key ? vnode.props.key : vnode.props.id;

export const isNoriElement   = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.element';
export const isNoriComponent = vnode => Object.getPrototypeOf(vnode.type) === NoriComponent;
export const isComponentElement = vnode => typeof vnode === 'object' && typeof vnode.type === 'function';
export const setCurrentVDOM  = tree => _currentVDOM = tree;
export const getCurrentVDOM  = _ => cloneNode(_currentVDOM);
export const isInitialized   = _ => _currentStage !== STAGE_UNITIALIZED;
export const isRendering     = _ => _currentStage === STAGE_RENDERING;
export const isUpdating      = _ => _currentStage === STAGE_UPDATING;
export const isSteady        = _ => _currentStage === STAGE_STEADY;
export const getCurrentVnode = _ => _currentVnode;
export const setCurrentVnode = vnode => {
  _currentVnodeHookCursor = 0;
  _currentVnode           = vnode;
};

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => ({
  type,
  props   : props || {},
  children: args.length ? flatten(args) : [],
  _owner  : null, // will be the NoriComponent instance that generated the node
  $$typeof: Symbol.for('nori.element')
});

// Called from NoriDOM to render the first vdom
export const renderVDOM = node => {
  _currentStage = STAGE_RENDERING;
  const vdom    = reconcile(node);
  setCurrentVDOM(vdom);
  _currentStage = STAGE_STEADY;
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
  if (!_updateTimeOutID) {
    _updateTimeOutID = setTimeout(performUpdates, UPDATE_TIMEOUT);
  }
};

const performUpdates = () => {
  if (isRendering()) {
    console.log(`>>> Update called while rendering`);
    return;
  }

  // console.time('update');
  clearTimeout(_updateTimeOutID);
  _updateTimeOutID = null;

  _currentStage = STAGE_RENDERING;

  const updatedVDOMTree = getDidUpdateQueue().reduce((acc, id) => {
    acc = updateComponentVDOM(id)(acc);
    return acc;
  }, getCurrentVDOM());
  // TODO FOPT => get updatedVDOM tree to flow into patch and setCurrentVDOM
  patch(updatedVDOMTree, getCurrentVDOM());
  setCurrentVDOM(updatedVDOMTree);

  performDidMountQueue();

  _currentStage = STAGE_UPDATING;
  performDidUpdateQueue(_componentInstanceMap);
  _currentStage = STAGE_STEADY;
  // console.timeEnd('update');
};

//------------------------------------------------------------------------------
//RECONCILIATIONRECONCILIATIONRECONCILIATIONRECONCILIATIONRECONCILIATIONRECONCIL
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree for the first render of a component or tree
// Component -> Element
// Element -> Element
const reconcile = vnode => {
  vnode = cloneNode(vnode);
  if (isComponentElement(vnode)) {
    vnode          = compose(renderComponentNode, instantiateNewComponent)(vnode);
  }
  if (vnode.hasOwnProperty('children')) {
    vnode.children = reconcileComponent(vnode).map(reconcile);
  }
  return vnode;
};

// Updates the vdom rerendering only the nodes that match an id
const updateComponentVDOM = id => vnode => {
  vnode = cloneNode(vnode);
  if (typeof vnode === 'object') {
    if (hasOwnerComponent(vnode) && vnode.props.id === id) { //
      vnode = renderComponentNode(instantiateNewComponent(vnode));
    } else if (isComponentElement(vnode)) {
      vnode = reconcile(vnode); // new component added
    }
    if (vnode.hasOwnProperty('children')) {
      vnode.children = reconcileComponent(vnode).map(updateComponentVDOM(id));
    }
  }
  return vnode;
};

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const reconcileComponent = vnode => {
  let children    = vnode.children,
      result      = [],
      resultIndex = [],
      index       = 0;

  children = children.map((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();
      childResult     = childResult.map((c, i) => {
        if (typeof c.type === 'function') {
          c = reconcile(c);
        } else if (typeof c === 'object' && !getKeyOrId(c)) { //c.props.id
          c.props.id = c.props.id ? c.props.id : vnode.props.id + `.${i}.${index++}`;
        }
        return c;
      });
      result.unshift(childResult);
      resultIndex.unshift(i);
    } else {
      child = reconcile(child);
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
  if (_componentInstanceMap.hasOwnProperty(id)) {
    instance = _componentInstanceMap[id];
  } else if (typeof vnode.type === 'function') {
    vnode.props.children = Is.array(vnode.children) ? vnode.children : [vnode.children];
    instance             = new vnode.type(vnode.props);
    if (isNoriComponent(vnode)) {
      // Only cache NoriComps, not SFCs
      id                        = instance.props.id; // id could change during construction
      _componentInstanceMap[id] = instance;
    }
  } else if (vnode.hasOwnProperty('_owner')) {
    instance                  = vnode._owner;
    id                        = instance.props.id;
    _componentInstanceMap[id] = instance;
  } else {
    console.warn(`instantiateNewComponent : vnode is not component type`, typeof vnode.type, vnode);
  }
  return instance;
};

const renderComponentNode = instance => {
  if (typeof instance.internalRender === 'function') {
    // Set currently rendering for hook
    setCurrentVnode(instance);
    let vnode    = instance.internalRender();
    vnode._owner = instance;
    setCurrentVnode(null);
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
    delete _componentInstanceMap[vnode._owner.props.id];
  }
};


/* Let's play with _hooksMap!
https://reactjs.org/docs/_hooksMap-reference.html
React's Rules:
  1. must be called at in the redner fn
  2. called in the same order - not in a conditional
  3. No loops
*/

let _hooksMap = {},
    _currentVnodeHookCursor;

const registerHook = (type, ...args) => {
  let cVnode = getCurrentVnode();
  if (!cVnode) {
    console.warn(`registerHook : Can't register hook, no current vnode!`);
    return;
  }
  const id = cVnode.props.id;

  if (!_hooksMap.hasOwnProperty(id)) {
    _hooksMap[id] = [];
  }
  if (!_hooksMap[id][_currentVnodeHookCursor]) {
    _hooksMap[id].push({type, vnode: cVnode, data: args});
    //console.log(`NEW hook ${type} for ${id} at ${_currentVnodeHookCursor}`, args);
  } else {
    const runHook = _hooksMap[id][_currentVnodeHookCursor];
    console.log(`RUN hook ${type} for ${id}`, runHook);
    switch (runHook.type) {
      case 'useState':
        console.log(`useState: `, runHook.data);
        break;
      case 'useEffect':
        console.log(`useEffect: `, runHook.data);
        break;
      default:
        console.warn(`unknown hook type: ${runHook.type}`)
    }
  }
  _currentVnodeHookCursor++;
};

const unregisterHook = (vnode, type) => {
  console.log(`unregisterHook for `, vnode, type);
};

const performHook = vnode => {
  console.log(`performHook for `, vnode);
};

export const useState = (initialState) => {
  registerHook('useState', initialState);
};

export const useEffect = (didUpdateFn) => {
  registerHook('useEffect', didUpdateFn);
};