import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import Component from './nori/Component';
import Greeter from './Greeter';

(($global)=> {

  const applicationRoot = document.querySelector('#js-application');

  // const red = css`color: red`;
  // const blue = css`color: blue`;

  // let text = new Component(`span`, {mouseover: (e) => {console.log(e)}}, 'Hi ');
  // let text2 = new Component(`span`, {class: blue}, [text, 'there ']);
  // let text3 = new Component(`span`, {}, [text, text2, 'Matt']);

  //{class: red, click: (e) => {greeting.remove();}},
  // let greeting = new Component(`h1`, {}, ['Hello {{foo}}']);
  let greeting = new Greeter();

  greeting.renderTo(applicationRoot);

})(window);
