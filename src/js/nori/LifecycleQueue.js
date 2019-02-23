import {clone} from 'lodash';

let didMountQueue  = [],
    didUpdateQueue = [];

export const enqueueDidMount = id => didMountQueue.push(id);

export const getDidMountQueue = _ => clone(didMountQueue);

export const performDidMountQueue = () => {
  didMountQueue.forEach(fn => fn());
  didMountQueue = [];
};

export const enqueueDidUpdate = id => didUpdateQueue.push(id);

export const getDidUpdateQueue = _ => clone(didUpdateQueue);

export const performDidUpdateQueue = map => {
  didUpdateQueue.forEach(id => {
    if (!map[id]) {
      console.warn(`performDidUpdateQueue : Can't get component instance ${id}, it's been removed.`);
    } else if (typeof map[id].componentDidUpdate === 'function') {
      map[id].componentDidUpdate()
    }
  });
  didUpdateQueue = [];
};