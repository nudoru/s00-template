

// export const getVDOMTree = (vdomTree, id) => {
//   // if (typeof vdomTree === 'object') {
//   if (typeof vdomTree.owner === 'object') {
//     // if (vdomTree.props.id === id) {
//     if (vdomTree.owner.props.id === id) {
//       return vdomTree;
//     } else if (vdomTree.props.children) {
//       vdomTree.props.children.forEach(child => getVDOMTree(child, id));
//     }
//   }
//   return null;
// };

// export const replaceVDOMInTree = (vdomTree, id, newVdom) => {
//   console.log('replaceVDOMInTree', vdomTree, newVdom);
//   if (vdomTree.props.id === id) {
//     vdomTree = newVdom;
//   } else if (vdomTree.props.children) {
//     vdomTree.props.children.map(child => replaceVDOMInTree(child, id, newVdom));
//   }
//   return vdomTree;
// };