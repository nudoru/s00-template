/* @jsx h */

import {Global} from './theme/Global';
import {theme} from './theme/Theme';
import {css} from 'emotion';
import {h} from './nori/Nori';
import {render} from './nori/NoriDOM';
import Box from './components/Box';
import Lorem from './components/Lorem';
import Ticker from './components/Ticker';
import Greeter from './components/Greeter';
import Lister from './components/Lister';
import ColorSwatch from './components/ColorSwatch';

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

const Sfc = props => <span><h1>{props.message}</h1><Greeter/></span>;

//https://overreacted.io/how-are-function-components-different-from-classes/
const SFCWithJuice = (props) => {
  const showMessage = () => {
    alert('Followed ' + props.user);
  };

  const handleClick = () => {
    setTimeout(showMessage, 1000);
  };

  return (
    <button onClick={handleClick}>SFC With Juice</button>
  );
};

let testBox = <Box key='main' className={appContainer}>
  <Box className={blackBox}>
    <Lorem mode={Lorem.TITLE}/>
    <Box className={whiteBox}>
      <Sfc message='IMA sfc'/>
      <SFCWithJuice user='Dan'/>
      <Ticker/>
      <span><ColorSwatch/></span>
      <Greeter/>
      <Lister/>
    </Box>
  </Box>
</Box>;

render(testBox, document.querySelector('#js-application'));
