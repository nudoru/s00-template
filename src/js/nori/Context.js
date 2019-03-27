import NoriComponent from './NoriComponent';

//https://reactjs.org/docs/context.html

export const createContext = defaultValue => {

  const CntxtClass = new NoriComponent();
  CntxtClass.Provider = new Provider();
  CntxtClass.Consumer = new Consumer();

  return CntxtClass;

};

class Provider extends NoriComponent {
  constructor(props) {
    super(props);
  };
}

class Consumer extends NoriComponent {
  constructor(props) {
    super(props);
  };
}