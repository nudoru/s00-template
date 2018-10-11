import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import Component from './nori/Component';
import Greeter from './Greeter';
import * as Lorem from './nori/util/Lorem';

(($global)=> {

  const applicationRoot = document.querySelector('#js-application');

  const red = css`color: red; cursor: pointer;`;
  const blue = css`color: blue`;

  let text = new Component(`span`, {attrs: {mouseover: (e) => {console.log(e)}}}, 'Hi ');
  let text2 = new Component(`span`, {attrs:{class: blue}}, [text, 'there ']);
  let text3 = new Component(`span`, {}, [text, text2, 'Matt']);
  let text4 = new Component(`h3`, {attrs:{class: blue}}, [text, 'there ']);
  //{class: red, click: (e) => {greeting.remove();}},
  let greeting = new Component(`p`,
    {attrs:{class: red, click: (e) => {greeting.state = {foo:Lorem.firstLastName(), bar:Lorem.text(2,6)};}}},
    ['Hello <strong>{{foo}}</strong>', text, text2, text3, 'What\'s the {{bar}}' ]);
  // let greeting = new Greeter();
  // console.log(greeting.$render());
  text4.renderTo(applicationRoot);
  text4.renderTo(applicationRoot);
  greeting.renderTo(applicationRoot);
  text4.renderTo(applicationRoot);
  text4.renderTo(applicationRoot);

})(window);
