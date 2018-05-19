import { bind } from '../helper'

window.requestAnimFrame = (fn, immediate, context, element) => {
  let returnReq
  const f = bind(fn, context);
  const request = (window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame
    || function (callback) { // eslint-disable-line
      window.setTimeout(callback, 1000 / 60);
    });
  if (request) {
    returnReq = request.call(window, f, element);
  }
  if (immediate) {
    f();
  } else {
    returnReq = window.setTimeout(f, 16);
  }
  return returnReq;
};

const getCancelAnimFrame = () => {
  const prefixs = ['webkit', 'moz', 'o', 'ms'];
  let func = window.cancelAnimationFrame;
  for (let i = 0, len = prefixs.length; i < len && !func; i++) { // eslint-disable-line
    func = window[`${prefixs[i]}CancelAnimationFrame`] || window[`${prefixs[i]}CancelRequestAnimationFrame`];
  }
  return func;
};

window.cancelAnimFrame = id => {
  const cancel = getCancelAnimFrame();
  if (cancel) {
    cancel.call(window, id);
  } else {
    window.clearTimeout(id);
  }
};
