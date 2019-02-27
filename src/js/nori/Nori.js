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
//import {diff} from 'deep-diff';

let currentHostTree,
    componentInstanceMap = {},
    updateTimeOut;

export const isNoriComponent    = test => test.$$typeof && Symbol.keyFor(test.$$typeof) === 'nori.component';
export const setCurrentHostTree = tree => currentHostTree = tree;
export const getCurrentHostTree = _ => cloneNode(currentHostTree);
const isVDOMNode                = node => typeof node === 'object' && node.hasOwnProperty('type') && node.hasOwnProperty('props') && node.hasOwnProperty('children');
const cloneNode                 = node => cloneDeep(node); // Warning: Potentially expensive
const hasOwnerComponent         = node => node.hasOwnProperty('owner') && node.owner !== null;

//------------------------------------------------------------------------------
//PUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLICPUBLIC
//------------------------------------------------------------------------------

// Create VDOM from JSX. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props    = props || {};
  // TODO fix this
  if (props.key === 0) {
    console.warn(`Component key can't be '0' : ${type} ${props}`)
  }
  return {
    type, props, children: args.length ? flatten(args) : [], owner: null
  };
};

//------------------------------------------------------------------------------
//CREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATIONCREATI
//------------------------------------------------------------------------------

// Renders out components to get a vdom tree of just html
export const createInitialComponentVDOM = node => {
  node = cloneNode(node);
  if (typeof node === 'object') {
    if (typeof node.type === 'function') {
      node = renderComponentNode(instantiateNewComponent(node));
    }
    node.children = renderChildFunctions(node).map(createInitialComponentVDOM);
  } else if (typeof node === 'function') {
    console.warn(`createComponentVDOM : node is a function`, node);
  } //else if(typeof node === 'string' || typeof node === 'number') {
    //const nodeval = node;
    //node = {type: '__string', props: {}, children: [nodeval], owner: null}
 // }
  return node;
};

const nodeIDorKey = node => node.props.key ? '' + node.props.key : getNextId();

// If children are an inline fn, render and insert the resulting children in to the
// child array at the location of the fn
// works backwards so the insertion indices are correct
const renderChildFunctions = node => {
  let childArry = node.children,
      result      = [],
      resultIndex = [],
      index = 0;

  childArry.forEach((child, i) => {
    if (typeof child === 'function') {
      let childResult = child();

      childResult.forEach((c, i) => {
        if(typeof c === 'object' && !c.props.id) {
          c.props.id = c.props.id ? c.props.id : node.props.id+`.${i}.${index++}`;
        }
      });

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
    // Assign the instance id on to the node if it didn't have one
    if(!node.props.hasOwnProperty('id') || node.props.id.indexOf('element-id-') === 0) {
      node.props.id = instance.props.id;
    }
    // console.log(`renderComponentNode : ${node.props.id}(${instance.props.id})`);
    node.children.forEach((child, i) => {
      if(typeof child === 'object' && !child.props.id) {
        // child.props.id = nodeIDorKey(child)+`.${i}`;
        child.props.id = child.props.id ? child.props.id : node.props.id+`.${i}`;
        // console.log(`${node.props.id} -> ${child.props.id}`);
      }
    });
    instance.vdom = node;
    node.owner    = instance;
    return node;
  } else if (isVDOMNode(instance)) {
    // SFC
    if(!instance.props.id) {
      instance.props.id = nodeIDorKey(instance)
    }
    return instance;
  } else {
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
      node.children = renderChildFunctions(node);
    } else if (typeof node.type === 'function') {
      // During the update of a parent node, a new component has been added to the child
      node = createInitialComponentVDOM(node);
    }
    node.children = node.children.map(child => updateComponentVDOM(child, id));
  } //else if(typeof node === 'string' || typeof node === 'number') {
    //const nodeval = node;
   // node = {type: '__string', props: {}, children: [nodeval], owner: null}
  //}
  return node;
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
  //console.time('update');
  let updatedVDOMTree = getCurrentHostTree();
  clearTimeout(updateTimeOut);
  updateTimeOut = null;
  getDidUpdateQueue().forEach(id => {
    updatedVDOMTree = updateComponentVDOM(updatedVDOMTree, id);
  });



  let result = patch(updatedVDOMTree, getCurrentHostTree());
  //console.log('DOM Patches: ', result);


  setCurrentHostTree(updatedVDOMTree);
  performDidMountQueue();
  performDidUpdateQueue(componentInstanceMap);
  //console.timeEnd('update');
};

/*
// let pat = [];
  // vdiff(getCurrentHostTree(), updatedVDOMTree, pat);
  // pat.forEach(patch => applyPatch(patch));
-------
// let vdiff =diff(getCurrentHostTree(), updatedVDOMTree);
  // patch(vdiff, getCurrentHostTree(), updatedVDOMTree);
 */

// https://blog.javascripting.com/2016/10/05/building-your-own-react-clone-in-five-easy-steps/
const vdiff = (left, right, patches, parent = null) => {
  // For text nodes
  if(!left && !right) {
    //console.log('was text node i assume', parent.children[0]);
  } else if (!left) {
    patches.push({
      parent,
      type: 'CREATE',
      node: right
    });
  } else if (!right) {
    patches.push({
      type: 'REMOVE',
      node: left
    });
  } else if (left.type !== right.type) {
    patches.push({
      type: 'REPLACE',
      replacingNode: left,
      node: right
    });
  } else {
    // Text nodes don't have children
    let leftChildren = left.hasOwnProperty('children') ? left.children.length : 0,
        rightChildren = right.hasOwnProperty('children') ? right.children.length : 0;

    const children = leftChildren >= rightChildren ? left.children : right.children;

    // Handle text nodes
    if(!children) {
      //console.log(parent,'has no children');
      if(left && right) {
        if(left !== right) {
          patches.push({
            parent,
            type: 'REPLACE',
            replacingNode: left,
            node: right,
            isText: true
          });
        }
      } else if(left && !right) {
        patches.push({
          parent,
          type: 'REMOVE',
          node: left,
          isText: true
        });
      } else if(!left && right) {
        patches.push({
          parent,
          type: 'CREATE',
          node: right,
          isText: true
        });
      }
      vdiff(null, null, patches, parent);
    } else {
      children.forEach((child, index) => vdiff(
        (leftChildren ? left.children[index] : null),
        (rightChildren ? right.children[index] : null),
        patches,
        left
      ));
    }
  }
};