/* @jsx c */

import * as GlobalCSS from './theme/Global'; // For global CSS reset + a few styles for html and body
import {css} from 'emotion';
import Greeter from './Greeter';
import * as Lorem from './nori/util/Lorem';
import {c, render} from './nori/C';

(($global)=> {

  const red = css`color: red; cursor: pointer;`;
  const blue = css`color: blue`;

  const applicationRoot = document.querySelector('#js-application');

  const _onGreetClick = evt => {
    console.log('greet!',evt);
    evt.component.state = {name:Lorem.firstLastName()};
  };

  const _onGreetRender = evt => {
    console.log('greet rendered!', evt);
  };

  const _onGreetUpdate = evt => {
    console.log('greet update!', evt.component.state);
  };

  // let test = <p>Hi, <strong>There!</strong></p>;
  let test = <p class={blue}>Hi, <Greeter triggers={{
    click: _onGreetClick,
    render: _onGreetRender,
    update: _onGreetUpdate,
  }}>There</Greeter></p>;


  render(test, applicationRoot);

})(window);
