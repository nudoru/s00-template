/* @jsx h */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {theme} from './theme/Theme';
import {css} from 'emotion';
import * as L from './nori/util/Lorem'
import {h, renderDOM, } from './nori/Nori';

import Box from './components/Box';
import Lorem from './components/Lorem';
import Greeter from './components/Greeter';
import Ticker from './components/Ticker';

// ${tme.gradients['premium-white']};
const appContainerBG = require('../img/pattern/shattered.png');
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

const whiteBox = css`
  display: block;
  padding: 1rem;
  color: #000;
  overflow: hidden;
  background-image: ${theme.gradients['premium-white']};
  box-shadow: ${theme.shadows.dropShadow.bigsoft};
`;

const blackBox = css`
  display: block;
  padding: 1rem;
  color: #fff;
  overflow: hidden;
  background-image: ${theme.gradients['premium-dark']};
  box-shadow: ${theme.shadows.dropShadow.bigsoft};
`;

const applicationRoot = document.querySelector('#js-application');

const Sfc = _ => <h1>I'm a stateless functional component</h1>;

let testBox = <Box key='main' className={appContainer}>
    <Box className={blackBox}>
      <Lorem mode={Lorem.TITLE}/>
      <Box className={whiteBox}>
        <Lorem mode={Lorem.TITLE}/>
        <Box className={blackBox}>
          <Lorem mode={Lorem.TITLE}/>
          <Box className={whiteBox}>
            <Sfc/>
            <Ticker />
            <Greeter />
            <p>Oh, look. Another one ...</p>
            <Greeter />
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>;

renderDOM(testBox, applicationRoot);
