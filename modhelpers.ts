"use strict";
// Debugging helper functions


/**
 * Helper function, prints the global functions's args to console every time it's called.
 * @param funcname
 */
function listenIn(funcname: string) {
  const origFunc = window[funcname];
  window[funcname] = function (...args) {
    console.debug("Listening in " + funcname);
    console.debug(args);
    return origFunc(...args);
  };
}
