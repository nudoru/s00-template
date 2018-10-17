import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import Component from './nori/Component';
import Greeter from './Greeter';
import * as Lorem from './nori/util/Lorem';
import {c, render} from './nori/C';
(($global)=> {

  const applicationRoot = document.querySelector('#js-application');

  const red = css`color: red; cursor: pointer;`;
  const blue = css`color: blue`;

  let text = new Component(`span`, {attrs: {mouseover: (e) => {console.log(e)}}}, 'Hi ');
  let text2 = new Component(`span`, {attrs:{class: blue}}, [text, 'there ']);
  let text3 = new Component(`span`, {}, [text, text2, 'Matt']);
  let text4 = new Component(`h3`, {attrs:{class: blue}}, [text, 'there ']);

  const _onGreetClick = evt => {
    console.log('greet!',evt);
    evt.component.state = {foo:Lorem.firstLastName(), bar:Lorem.text(2,6)};
  };

  //{class: red, click: (e) => {greeting.remove();}},
  let greeting = new Component(`p`,
    {
      attrs:{class: red},
      triggers:{click: _onGreetClick}
    },
    ['Hello <strong>{{foo}}</strong>', text, text2, text3, 'What\'s the {{bar}}' ]);

  // text4.renderTo(applicationRoot);
  // text4.renderTo(applicationRoot);
  // greeting.renderTo(applicationRoot);
  // text4.renderTo(applicationRoot);
  // text4.renderTo(applicationRoot);
  // let com = c(`p`,
  //   {attrs:{class: red, click: (e) => {this.state = {foo:Lorem.firstLastName(), bar:Lorem.text(2,6)};}}},
  //   ['Hello <strong>{{foo}}</strong>', text, text2, text3, 'What\'s the {{bar}}' ]);
  //
  // let com = c(Greeter, {},[]);
  // render(com, applicationRoot);

  // let greeting = new Greeter({}, []);
  greeting.renderTo(applicationRoot);

})(window);
