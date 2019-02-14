import DOMComponent from './DOMComponent';
import Is from './util/is';
import {removeAllElements} from "./browser/DOMToolbox";
import {flatten} from "./util/ArrayUtils";

//https://jasonformat.com/wtf-is-jsx/
//https://medium.com/@bluepnume/jsx-is-a-stellar-invention-even-with-react-out-of-the-picture-c597187134b7

// Convenience method to create new components. Used by the Babel/JSX transpiler
export const h = (type, props, ...args) => {
  props = props || {};

  let children = args.length ? flatten(args) : null;

  if (Is.string(type)) {
    // "regular" html tag
    return new DOMComponent(type, props, children);
  } else {
    // another component
    return new type(props, children);
  }
};


// Render a component to a dom node
export const renderDOM = (component, hostNode, removeExisting = true) => {
  if (removeExisting) {
    removeAllElements(hostNode);
  }
  hostNode.appendChild(component.$createVDOM());
};

// Simple implementation of React's useState hook, similar API totes different impl
// https://reactjs.org/docs/hooks-state.html

/*
Merge fn for updater
prevState => ({...prevState, ...updatedValues});
}

//for(let i=0; i<5; i++) {
  //   let [foo, setFoo] = useState('foo');
  //   console.log('foo is',foo);
  //   foo = setFoo(ps => ps + 'BAZ!');
  //   console.log('foo is',foo);
  //   foo = setFoo(ps => ps + 'BAZ!');
  //   console.log('foo is',foo);
  //   foo = setFoo(ps => ps + 'BAZ!');
  //   console.log('foo is',foo);
  //}

 */

let __stateValueMap = [];

export function useState(initial) {

  let stateIdx = __stateValueMap.length;

  if (!__stateValueMap[stateIdx]) {
    __stateValueMap[stateIdx] = initial;
  } else {
  }

  // console.log('useState', __stateValueMap);

  let setState = (newState) => {

    let currentValue = __stateValueMap[stateIdx];

    // console.log('updating the index at ', stateIdx, 'current value', currentValue);

    if (typeof newState === "function") {
      currentValue = newState(currentValue);
    } else {
      currentValue = newState;
    }

    __stateValueMap[stateIdx] = currentValue;

    return currentValue;
  };

  return [initial, setState];
}