/* @jsx c */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {theme} from './theme/Theme';
import {css} from 'emotion';

import {c, render} from './nori/C';

import Box from './components/Box';
import Lorem from './components/Lorem';


// const red = css`color: red; cursor: pointer;`;
// const blue = css`color: blue`;

const blackBox = css`
    display: inline-block;
    position: relative;
    width: 25%;
    height: 25%;
    padding: 1rem;
    color: #fff;
    background-image: ${theme.gradients['premium-dark']};
    box-shadow: ${theme.shadows.dropShadow.bigsoft};
`;

const applicationRoot = document.querySelector('#js-application');

let testBox = <Box class={blackBox}>
  <Lorem min={5} max={5} mode={Lorem.DATE}/>
  </Box>;

console.log(Lorem.TEXT)

render(testBox, applicationRoot);
