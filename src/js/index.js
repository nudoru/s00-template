import Global from './theme/Global'; // For global CSS reset + a few styles for html and body

import {appendElement, HTMLStrToNode} from "./nori/browser/DOMToolbox";

(($global)=> {

  const mountPoint = document.querySelector('#js-application');

  let els = HTMLStrToNode('<h1>Hello!</h1>');

  appendElement('#js-application', els);


})(window);
