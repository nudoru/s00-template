/* @jsx h */

/**
 * Example component that demos input fields and useState
 */

import {h} from "../nori/Nori";
import {useState} from "../nori/Hooks";
import {css} from 'emotion';

const blue = css`
  padding-left: 1rem;
  color: blue;
`;

export const InputControls = props => {
  let [inputValue, setInputValue] = useState('');

  const _onInputChange = e => {
    //console.log('input',e);
    setInputValue(e.target.value);
  };

  const _onInputFocus = e => console.log('focus',e);
  const _onInputBlur = e => console.log('blur',e);

  return (
    <div><input
      type='text'
      placeholder='Type here'
      onInput={_onInputChange}
      onFocus={_onInputFocus}
      onBlur={_onInputBlur}
    /><span className={blue}>{inputValue}</span></div>
  )
};