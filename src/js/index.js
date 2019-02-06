/* @jsx c */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {theme} from './theme/Theme';
import {css} from 'emotion';

import {c, render} from './nori/C';

import Box from './components/Box';
import Lorem from './components/Lorem';

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

const _onGreetClick = evt => {
  console.log('greet!',evt);
};

const _onGreetRender = evt => {
  console.log('greet rendered!', evt);
};

const _onGreetUpdate = evt => {
  console.log('greet update!', evt.component.state);
};

let testBox = <Box class={appContainer}>
    <Box class={blackBox}>
      <Lorem element='p' min={5} max={5} mode={Lorem.TITLE}/>
      <Box class={whiteBox}>
        <Lorem element='p' min={5} max={5} mode={Lorem.TITLE}/>
        <Box class={blackBox}>
          <Lorem element='p' min={5} max={5} mode={Lorem.TITLE}/>
          <Box class={whiteBox}>
            <p
              triggers={{
                  click: _onGreetClick,
                  render: _onGreetRender,
                  update: _onGreetUpdate,
                }}
            >Click me!</p>
          </Box>
        </Box>
      </Box>
    </Box>
  </Box>;

render(testBox, applicationRoot);
