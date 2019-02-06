/* @jsx c */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {theme} from './theme/Theme';
import {css} from 'emotion';

import {c, render} from './nori/C';

import Box from './components/Box';
import Lorem from './components/Lorem';

// ${tme.gradients['premium-white']};
const appContainerBG = require('../img/pattern/debut_light.png');
const appContainer = css`
  position: absolute;
  overflow: auto;
  display: grid;
  grid-template: 1fr / 1fr;
  align-items: center;
  justify-items: center;
  width: 100%;
  height: 100%;
  background-image: url(${appContainerBG});
  border: 1rem solid rgb(255,255,255);
  box-shadow: 0 0 50px inset rgba(0,0,0,.1);
`;

const blackBoxBg = require('../img/pattern/wood_1.png');
const blackBox = css`
  display: block;
  padding: 1rem;
  color: #fff;
  width: 25%;
  height: 25%;
  overflow: hidden;
  background-image: ${theme.gradients['premium-dark']};
  box-shadow: ${theme.shadows.dropShadow.bigsoft};
`;

const applicationRoot = document.querySelector('#js-application');

let testBox = <Box class={appContainer}>
    <Box class={blackBox}>
      <Lorem min={5} max={5} mode={Lorem.TITLE}/>
    </Box>
  </Box>;

render(testBox, applicationRoot);
