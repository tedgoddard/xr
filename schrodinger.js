//ported from http://physics.bu.edu/~py502/lectures4/examples/schrod1d.f90

const xmax = 1
const nx = 1000
const de = 0.1
const eps = 1e-6
const h = xmax / nx
const h2 = h**2
const h12 = h2 / 12
let psiData = (new Array(2 * nx + 1)).fill(0.0)
psiData = psiData.map( (_, i) => Math.abs(10 * Math.sin(Math.PI * 4 * i / psiData.length)))

const psi0 = 0
const psi1 = 0.0001

let e1 = 4 // user input
let e2 = 0
let ee = 0
let q0 = 0
let q1 = 0
let f1 = 0
let p1 = 0

function setinitcond() {
  psiData[0] = psi0
  psiData[1] = psi1
  p1 = psi0
  f1 = 2 * (V(-xmax) - ee)
  q0 = psi0 * (1 - h12 * f1)
  f1 = 2 * (V(-xmax + h) - ee)
  q1 = psi1 * (1 - h12 * f1)
}

function psi(x) {
  return psiData[x + nx]
}

function normalize(f) {
  let norm = f(-nx)**2 + f(nx)**2
  for (let i = -nx + 1; i <= nx - 3; i += 2) {
    norm += 4 * f(i)**2 + 2 * f(i + 1)**2
  }
  console.log(`norm=${norm}`)

  norm += 4 * f(nx - 1)**2

  norm = 1 / Math.sqrt(norm * h / 3)
  psiData = psiData.map(p => p * norm)
}

function numerovstep(x) {
  const q2 = h2 * f1 * p1 +2 * q1 - q0

  q0 = q1
  q1 = q2
  f1 = 2 * (V(x) - ee)
  p1 = q1 / (1 - h12 * f1)
}

function integrate(_e) {
  ee = _e
  setinitcond()
  for (let i = -nx + 2; i <= nx; i++) {
    const x = i * h
    numerovstep(x)
    psiData[i + nx] = p1
  } 
  normalize(psi)
}

let ni = 0
let b1 = 0
let b2 = 0
let schrodingerState = "searchSetup"

function schrodinger1d() {
  if (schrodingerState == "searchSetup") {
    schrodinger1dSearchSetup()
    schrodingerState = "searching"
    return
  }
  if (schrodingerState == "searching") {
    if (!schrodinger1dsearch()) {
      schrodingerState = "bisectionSetup"
    }
    return
  }
  if (schrodingerState == "bisectionSetup") {
    schrodinger1dBisectionSetup()
    schrodingerState = "bisecting"
    console.log("BISECTING")
    return
  }
  if (schrodingerState == "bisecting") {
    if (!schrodinger1dbisection()) {
      schrodingerState = "done"
    }
    return
  }
}

function schrodinger1dSearchSetup() {
  ni = 0
  b1 = 0
  b2 = 0
  integrate(e1)
  b1 = psi(nx)
  console.log(`${ni} E = ${e1}  Boundary Deviation ${b1}`) 
}

function schrodinger1dsearch() {
  console.log('Starting course search')
  ni += 1
  e2 = e1 + de
  integrate(e2)
  b2 = psi(nx)
  console.log(`${ni} E = ${e2}  Boundary Deviation ${b2}`) 
  if (b1 * b2 < 0) {
    return false
  }
  e1 = e2
  b1 = b2
  return true
}

function schrodinger1dBisectionSetup() {
  ni = 0
}

function schrodinger1dbisection() {

  console.log('Starting bisection')
  ni += 1
  const e0 = (e1 + e2) / 2
  integrate(e0)
  const b0 = psi(nx)
  console.log(`<eps ${Math.abs(b0)} ${eps}`)
  if (Math.abs(b0) <= eps) {
    console.log(`SMALLER <eps ${Math.abs(b0)} ${eps}`)

    return false
  }
  console.log(`${ni} E = ${e0}  Boundary Deviation ${b0}`) 

  if (b0 * b1 <= 0) {
    e2 = e0      
    b2 = b0 
  } else {
    e1 = e0
    b1 = b0
  }
  return true
}

function Vdefault(x) {
  // if (Math.abs(x) < 0.5) {
  //   return 0
  // } else {
  //   return 10
  // }

  if (x > -0.5 && x < 0.5) {
    return 11
  }
  return 0
}

let V = null

export class Schrodinger {
  constructor() {
    this.Vdefault = Vdefault
    this.xmax = xmax
  }
  
  set V(v) {
    V = v
  }

  set E(e) {
    e1 = e
  }

  search() {
    schrodingerState = "searchSetup"
  }

  get data() {
    return psiData
  }

  step() {
    schrodinger1d()
  }

}