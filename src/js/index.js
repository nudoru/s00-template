import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import {appendElement, HTMLStrToNode} from "./nori/browser/DOMToolbox";
import Component from './nori/Component';

(($global)=> {

  const applicationRoot = document.querySelector('#js-application');

  const red = css`color: red`;

  let greeting = new Component(`h1`,
    `{{greeting}}, {{firstName}}`,
    {className: red, click: (e) => {greeting.remove();}},
    {greeting: 'Hi', firstName: 'Matt'});


  greeting.renderTo(applicationRoot, e=> console.log('el',e));

})(window);
