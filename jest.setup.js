import '@testing-library/jest-dom'

// Fix for setImmediate not defined error
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))