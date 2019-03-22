/* @jsx h */

/**
 * Example component that uses hooks
 */

import {h} from "../nori/Nori";
import {useState, useEffect, useMemo, useRef} from "../nori/Hooks";
import {css} from 'emotion';

const blue = css`
  padding-left: 1rem;
  color: blue;
`;


const useTitle = title => {
  useEffect(() => {
    document.title = title;
  });
};

const useGetInputDisplay = value => {
  return useMemo(() => {
    return <span className={blue}><span>{value}</span></span>;
  }, [value]);
};

export const InputControls = props => {
  let [inputValue, setInputValue] = useState('');
  let Output = useGetInputDisplay(inputValue);
  useTitle(inputValue);
  const inputRef = useRef(null);

  const _onInputChange = e => {
    setInputValue(e.target.value);
  };

  const _onInputFocus = e => console.log('focus',e);
  const _onInputBlur = e => console.log('blur',e);

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