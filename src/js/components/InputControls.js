/* @jsx h */

/**
 * Example component that demos input fields and useState
 */

import {h} from "../nori/Nori";
import {useState, useEffect, useMemo} from "../nori/Hooks";
import {css} from 'emotion';

const blue = css`
  padding-left: 1rem;
  color: blue;
`;

export const InputControls = props => {
  let [inputValue, setInputValue] = useState('');

  let Output = useMemo(() => {
    return <span className={blue}><span>{inputValue}</span></span>;
  }, [inputValue]);

  useEffect(() => {
    //console.log('input effect', inputValue);
    document.title = inputValue;
    return function() {
      //console.log('inputControls, useEffect cleanup');
    };
  });

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
    /><Output/></div>
  )
};