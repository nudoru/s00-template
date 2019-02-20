/* @jsx h */

import {Global} from './theme/Global';
import {theme} from './theme/Theme';
import {css} from 'emotion';
import {h, render,} from './nori/Nori';
import Box from './components/Box';
import Lorem from './components/Lorem';
import Ticker from './components/Ticker';
import Greeter from './components/Greeter';
import Lister from './components/Lister';

// ${tme.gradients['premium-white']};
const appContainerBG = require('../img/pattern/shattered.png');
const appContainer   = css`
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
//
// let testHTML = <div><h1>Heading 1</h1>
//   <div>
//     <h1>1</h1>
//     <Lorem mode={Lorem.TITLE}/>
//     <h3>3</h3>
//     <p>Para<strong>BOLD<em>EM!</em></strong></p>
//     <Box className={whiteBox}>
//       <Sfc/>
//     </Box>
//   </div>
// </div>;
//

let testBox = <Box key='main' className={appContainer}>
  <Box className={blackBox}>
    <Lorem mode={Lorem.TITLE}/>
    <Box className={whiteBox}>
      <Sfc/>
      <Ticker/>
      <Greeter/>
      <Greeter/>
      <Lister/>
    </Box>
  </Box>
</Box>;

render(<Lister/>, applicationRoot);
