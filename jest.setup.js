import '@testing-library/jest-dom'

// Fix for setImmediate not defined error
global.setImmediate = global.setImmediate || ((fn, ...args) => global.setTimeout(fn, 0, ...args))

// Add fetch polyfill for tests
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn()
}

// Mock NextResponse for API route testing
jest.mock('next/server', () => ({
  NextRequest: class NextRequest extends Request {
    constructor(input, init) {
      super(input, init)
    }
  },
  NextResponse: {
    json: (data, init) => {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'content-type': 'application/json',
          ...(init?.headers || {}),
        },
      })
    },
  },
}))

// Add Request/Response polyfills for Next.js API route testing
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this._url = input
      this.method = init?.method || 'GET'
      this.headers = new Map(Object.entries(init?.headers || {}))
      this.body = init?.body
    }
    
    get url() {
      return this._url
    }
    
    async json() {
      return JSON.parse(this.body)
    }
    
    async text() {
      return this.body
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body
      this.status = init?.status || 200
      this.headers = new Map(Object.entries(init?.headers || {}))
    }
    async json() {
      return JSON.parse(this.body)
    }
  }
}