export class Vector extends Array {
  constructor(n) {
    if (Array.isArray(n)) {
      super(n.length)
      n.forEach((x, i) => this[i] = x)
    } else {
      super(n)
      this.fill(0.0)
    }
  }

  multiply(g) {
    return this.map(multiply(g))
  }
  
  addScalar(c) {
    return this.map(addScalar(c))
  }

  multiplyScalar(c) {
    return this.map(multiplyScalar(c))
  }
  
  square() {
    return this.map(square)
  }
  
  add(g) {
    return this.map(add(g))
  }
  
  subtract(g) {
    return this.map(subtract(g))
  }
  
  dot(v) {
    return dot(this, v)
  }
  
  norm() {
    return dot(this, this)
  }

  max() {
    return max(this)
  }

  min() {
    return min(this)
  }

  copy(v) {
    this.forEach((x, i) => v[i] = x)
  }

  clone() {
    const v = new Vector(this.length)
    this.copy(v)
    return v
  }

}

// f.map(multiply(g)) returns componentwise f * g
export function multiply(g) {
  return (y, i) => y * g[i]
}

// f.map(multiplyScalar(c)) returns componentwise f * c
export function multiplyScalar(c) {
  return y => y * c
}

export function addScalar(c) {
  return y => y + c
}

// f.map(square) returns componentwise f * f
export function square(y) {
  return y * y
}

// f.map(add(g)) returns vector addition: componentwise f + g
export function add(g) {
  return (y, i) => y + g[i]
}

// f.map(subtract(g)) returns vector subtraction: componentwise f - g
export function subtract(g) {
  return (y, i) => y - g[i]
}

export function dot(u, v) {
  return u.reduce( (total, next, i) => total + u[i] * v[i], 0 )
}

function max(u) {
  return u.reduce( (total, next) => Math.max(total, next), Number.MIN_VALUE)
}

function min(u) {
  return u.reduce( (total, next) => Math.min(total, next), Number.MAX_VALUE)
}
