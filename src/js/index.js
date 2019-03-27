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
import {useState} from "./nori/Hooks";
import {InputControls} from "./components/InputControls";
import {Stepper} from "./components/Stepper";
import Nonpresentational from './components/Nonpresentational';

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

const SFCWithJuice = (props) => {
  const [buttonLabel, updateButton] = useState({label:'JOICE!', count:0});
  const handleClick = () => {
    updateButton({label:'You pushed me!', count:++buttonLabel.count});
  };
  return (
    <button onClick={handleClick}>SFC With Juice: {buttonLabel.label} {buttonLabel.count}</button>
  );
};

/*
      <Ticker/>

      <span><ColorSwatch/></span>

 */

let testBox = <Box key='main' className={appContainer}>
  <Box className={blackBox}>
    <Lorem mode={Lorem.TITLE}/>
    <Box className={whiteBox}>
      <Nonpresentational/>
      <Stepper/>
      <hr/>
      <InputControls/>
      <hr/>
      <Sfc message='IMA sfc'/>
      <SFCWithJuice/>
      <Greeter/>
      <Lister/>
    </Box>
  </Box>
</Box>;

  //<Box><SFCWithJuice/><Ticker/></Box>
render(<Box><Nonpresentational><p>I'm a pragraph</p></Nonpresentational></Box>, document.querySelector('#js-application'));
