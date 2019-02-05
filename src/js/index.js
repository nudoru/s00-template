/* @jsx c */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import Greeter from './Greeter';
import * as Lorem from './nori/util/Lorem';
import {c, render} from './nori/C';
import Box from './components/Box';

import {useState} from "./nori/C";

(($global)=> {

  // const red = css`color: red; cursor: pointer;`;
  // const blue = css`color: blue`;

  const applicationRoot = document.querySelector('#js-application');

  let testBox = <Box element='span'>Hi, I'm in a box</Box>


  render(testBox, applicationRoot);

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

})(window);
