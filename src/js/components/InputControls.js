/* @jsx h */

/**
 * Example component that demos input fields and useState
 */

import {h} from "../nori/Nori";
import {useState, useEffect, useMemo, useRef} from "../nori/Hooks";
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

  // let inputRef;

  const inputRef = useRef(null);

  useEffect(() => {
    // console.log('input useEffect, ref is', inputRef.current);
    document.title = inputValue;
    return function() {
      //console.log('inputControls, useEffect cleanup');
    };
  });

  const _onInputChange = e => {
    // console.log(inputRef.current);
    //console.log('input',e);
    setInputValue(e.target.value);
  };

  const _onInputFocus = e => console.log('focus',e);
  const _onInputBlur = e => console.log('blur',e);

  //el => inputRef = el
  return (
    <div><input
      ref={inputRef}
      type='text'
      placeholder='Type here'
      onInput={_onInputChange}
      onFocus={_onInputFocus}
      onBlur={_onInputBlur}
    /><Output/></div>
  )
};