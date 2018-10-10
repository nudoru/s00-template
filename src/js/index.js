import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import {appendElement, HTMLStrToNode} from "./nori/browser/DOMToolbox";
import Component from './nori/Component';

(($global)=> {

  const applicationRoot = document.querySelector('#js-application');

  const red = css`color: red`;
  const blue = css`color: blue`;

  let text = new Component(`span`, {}, 'Hi ');
  let text2 = new Component(`span`, {class: blue}, [text, 'there ']);
  let text3 = new Component(`span`, {}, [text, text2, 'Matt']);

  let greeting = new Component(`h1`,
    {class: red, click: (e) => {greeting.remove();}},
    [text3, text3]);


  greeting.renderTo(applicationRoot);
  console.log('Greeting rendered as ', greeting.current);
  greeting.state = {foo:'bar'};

})(window);
