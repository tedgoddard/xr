// import { multiply, add, subtract, dot } from "./vectorops.js"
// import { eigs } from "mathjs"
import { Vector, dot } from "./vectorops.js"

//ported from http://physics.bu.edu/~py502/lectures4/examples/lanczos.f90 

/*
!---------------------------------------------------------------------------!
! Lanczos calculation for a cubic d-dimensional box, discretized using L**d ! 
! elements. Energies are written to a file 'e.dat', and a selected state    !
! (its wave function squared) is written to 'p.dat'. The potential energy   !
! is stored in a vector vpot, which is constructed in the subroutine        !
! potentialenergy. The basis construction starts from a random state, for   !
! which a file seed.in containing four random seed integers is needed.      !
!---------------------------------------------------------------------------!
*/

 // lanczosvectors

 /*
 real(8), save, allocatable :: f0(:)
 real(8), save, allocatable :: f1(:)
 real(8), save, allocatable :: f2(:)
 real(8), save, allocatable :: aa(:)
 real(8), save, allocatable :: nn(:)

 real(8), allocatable :: psi(:)
 real(8), allocatable :: eig(:)
 real(8), allocatable :: vec(:,:)
*/




let randex = 0
const theRans = [
  0.86212276011065758 ,
  0.56959507793140374 ,
  0.94156024361588975 ,
  0.20786003610410109 ,
  0.68428697486621837 ,
  0.51814499436773842 ,
  0.28765382067109502 ,
  0.80669989794170083 ,
  0.42891740513905718 ,
  0.66620683397079739 ,
  0.64850993640592480 ,
  0.54750890736408853 ,
  0.26603316874916028 ,
  0.62709971393886499 ,
  0.23247210683100311 ,
  0.47065859451130032 ,
  0.90132623468119144 ,
  0.69577180049969023 ,
  0.81397453252102159 ,
  0.45940075539123904 ,
  0.53390600194069904 ,
  0.92865992171160294 ,
  0.82311515028101767 ,
  0.23134050911116188 ,
  0.77432611620522307 ,
  0.45903737045773807 ,
  0.87795280161791811 ,
  0.99572127186717130 ,
  0.39646923815232116 ,
  0.37460757427450719 ,
  0.78978570005669979 ,
  0.28642860974360829 ,
  0.82418148703053107 ,
  0.96714453023764491 ,
  0.48298869926361981 ,
  0.35938937137907623 ,
  0.36575302385276043 ,
  6.4878807253737070E-002 ,
  0.42711068422382292 ,
  0.97263326816500428 ,
  0.48800809255451688 ,
  3.2321448799998320E-002 ,
  0.85116868851983962 ,
  0.46193771918932858 ,
  0.27190239369933955 ,
  0.56442004615672936 ,
  0.17273416400409658 ,
  0.56268861389523661 ,
  0.78669892929432339 ,
  0.98791314574494371 ,
  0.90514490662260438 ,
  0.23387925693631573 ,
  0.35246304830920805 ,
  0.57163929506946809 ,
  0.26427421802346907 ,
  0.53615087752469215 ,
  0.57517582201936557 ,
  0.26518226884948554 ,
  0.97672759311183199 ,
  0.70197306488669931 ,
  0.92797879147156048 ,
  0.59511323497203117 ,
  0.28064197632579535 ,
  0.16403173715800995 ,
  0.45069302241955683 ,
  0.25906269005076521 ,
  4.8220063915443367E-002 ,
  0.39237389671669270 ,
  0.45226927890989177 ,
  0.90753900967294054 ,
  0.83860472380781981 ,
  0.20973857813229063 ,
  0.15324660134521662 ,
  9.7391067123377473E-002 ,
  0.50488898746639888 ,
  5.6562261447591633E-002 ,
  0.21434531715296884 ,
  0.17805802333624071 ,
  0.76069860134443612 ,
  0.63215122320879236 ,
  3.1491092694306833E-003 ,
  0.30739629155794540 ,
  0.76585931834301957 ,
  2.9849683856540021E-002 ,
  0.66275207869103581 ,
  0.24113331010648748 ,
  0.58537442762511949 ,
  0.15970390564424686 ,
  0.80400579811366191 ,
  0.15357070784410864 ,
  0.99979465183710792 ,
  0.31554995743517011 ,
  0.79924989435637828 ,
  0.62116343549625808 ,
  8.7029679402330362E-002 ,
  0.48115688953358920 ,
  0.13817333604424614 ,
  0.99464628318908743 ,
  7.6502816184810585E-002 ,
  0.27890955203413226 ,
  0.22350577800132410 ,
  0.60304660430871593 ,
  0.18862549249964472 ,
  0.35688607046293874 ,
  0.28442001564261093 ,
  0.15753294860838929 ,
  0.56328621110590482 ,
  0.94092612221843841 ,
  0.89517597052860687 ,
  0.90622661549447558 ,
  0.54366712683041341 ,
  0.85312502595289830 ,
  0.79231747157719035 ,
  0.43026282250333298 ,
  0.39491488120232265 ,
  0.68872508382479891 ,
  3.6276404885330515E-002 ,
  0.60291623630784441 ,
  0.12329477837597647 ,
  0.24950327179047244 ,
  0.52913630941164036 ,
  
]

const shallowParabola = (x, y) => ((x - 0.5)**2 + (y - 0.5)**2) * 50 -  2 * d
const steepParabola = (x, y) => ((x - 0.5)**2 + (y - 0.5)**2) * 100 -  2 * d
const eccentricParabola = (x, y) => ((x - 0.5)**2 + (8*y - 4)**2) * 100 -  2 * d
const roundedBox = (x, y) => ((8*x - 4)**4 + (8*y - 4)**4) * 2 -  2 * d


// 'Dimensionality (1-3)'
let d = 2
// 'Box length'
let len = 3
// 'Linear number of elements'
let l = 20 // 4
// 'Lanczos iterations'
let niter = 50 //5
// 'State n to write to file'
let st = 4
let vpotF = eccentricParabola

let psiLen = 0
let f0 = null
let f1 = null
let f2 = null
let aa = null
let nn = null

let psi = null
let eig = null
let vec = null
let delta = 1
let escale = 1
let vpot = null

export function setup(options) {
  mulberryRan = mulberry32(86212276011065758)

  l = options.l ?? 20
  d = options.d ?? 2
  len = options.len ?? 3
  niter = options.niter ?? 50
  st = options.st ?? 4
  vpotF = options.vpotF
console.log(options)
  psiLen = l**d
  f0 = new Vector(l**d)
  f1 = new Vector(l**d)
  f2 = new Vector(l**d)
  aa = new Vector(niter)
  nn = new Vector(niter)

  psi = new Vector(l**d)
  eig = new Vector(niter)
  // let vec = new Vector(niter, niter) //needs to be an array of vectors?
  vec = new Array(niter).fill().map(x => new Vector(niter))

  delta = len / l
  escale = 2 * delta**2  //! scale the energy so that the hopping t=1
  vpot = new Vector(l**d)
}

export function iterate() {
  potentialenergy(escale)

  initstate(psi, l**d) 
  lanczos1(l**d, niter, psi, eig, vec)
  const vec1 = new Vector(vec.map(v => v[st])).multiplyScalar(-1.0)
  // console.log("psi pre vec", st, vec)
  // console.log("psi pre vec1", vec1)
  lanczos2(l**d, niter, vec1) //vec(:,st)  //multiply -1 just to check for now

  //eig indexes: 0, niter-1
  const eigscale = eig.map( e => e / escale )
  // console.log("eig scaled", eigscale)

  //psi indexes: i=1,l**d
  // const psi2 = psi.map( p => p**2 )
  // console.log("psi^2", psi2)
  return { eig, psi, vpot, escale }
}

/*
!--------------------------------------------------------------!
! This subroutine is constructing the normalized basis states
! directly, with the coefficients aa(m) and nn(m) being the
! matrix elements of the tri-diagonal hamiltonian matrix.
!--------------------------------------------------------------!
*/
function lanczos1(n, niter, p0) {

//  use lanczosvectors

//  integer :: m,n,niter
//  real(8) :: t,eig(0:niter-1),vec(0:niter-1,0:niter-1),p0(n)

  // console.log('call lanczos1',n)
  // console.log('  n',n)
  // console.log('  niter',niter)
  // console.log('  p0',p0)
  // console.log('  eig',eig)
  // console.log('  vec',vec)



   f0 = p0
   nn[0] = 1.0
   hamoperation(l**d, f0, f1)
   aa[0] = dot(f0,f1)
   // f1 = f1.map(subtract(f0.map(multiplyScalar(aa[0])))) // f1 = f1 - aa[0] * f0
   f1 = f1.subtract(f0.multiplyScalar(aa[0])) // f1 = f1 - aa[0] * f0
   nn[1] = Math.sqrt(f1.dot(f1))
   // f1 = f1.map(multiplyScalar(nn[1])) // f1 / nn[1]
   f1 = f1.multiplyScalar(1 / nn[1]) // f1 / nn[1]
   // do m=2,niter
   for (let m = 2; m <= niter; m++) {
      // console.log('\nInitial Lanczos iteration: ', m)
      hamoperation(l**d, f1, f2)
      aa[m - 1] = dot(f1, f2)
      // f2 = f2.map(subtract(f1.map(f1.map(multiplyScalar(a[m-1])))).map(subtract(f0.map(multiplyScalar(nn[m-1]))))) // f2 - a[m - 1] * f1 -nn[m-1] * f0
      f2 = f2.subtract(f1.multiplyScalar(aa[m - 1])).subtract(f0.multiplyScalar(nn[m - 1])) // f2 - a[m - 1] * f1 -nn[m-1] * f0
      // console.log("1 CHECK f2:", f2[0])
      nn[m] = Math.sqrt(f2.dot(f2))
      f2 = f2.multiplyScalar(1/nn[m]) // f2 / nn[m]
      // console.log("2 CHECK f2:", f2[0])
      f0 = f1.clone()
      f1 = f2.clone()
      // console.log("wat", "CHECK:", [m, f0[0], f1[0], f2[0]].join("      "))
      // console.log("CHECK:", [m, f0[0], f1[0], f2[0]].join("      "))
   }
   diatri(niter)
}

/*
!-------------------------------------------------------------------!
! This subroutine re-constructs the normalized Lanczos basis states
! using the coefficients aa(m) and nn(m) previously computed in the 
! subroutine lanczos1(). The vector vec() is an eigenstate in the 
! Lanczos basis and it's tranformed to the real-space basis state 
! stored as the vector psi().
!-------------------------------------------------------------------!
*/
function lanczos2(n, niter, vec1) { 
//  use lanczosvectors

//  integer :: n,m,niter
//  real(8) :: psi(n),vec(0:niter-1)
 
// console.log('psi vec slice', vec1.join("      "));

  // console.log('psi ', -1, psi.join("      "));
  // console.log('psi scalar', -1, vec1[0]);
  const mult = vec1[0];
  // console.log('psi another', mult, psi.multiplyScalar(mult).join("      "));

   let f0 = psi.clone()
   // psi = psi.map(multiplyScalar(vec[0])) // psi * vec[0]
   psi = psi.multiplyScalar(vec1[0]);
  //  console.log('psi ', 0, psi.join("      "));

   hamoperation(l**d, f0, f1)
   // f1 = f1.map(subtract(f0.map(multiplyScalar(aa[0])))).map(multiplyScalar(1/nn[1])) // (f1 - aa[0] * f0) / nn[1]
   f1 = (f1.subtract(f0.multiplyScalar(aa[0]))).multiplyScalar(1/nn[1])
  //  psi = psi.map(add(f1.map(multiplyScalar(vec[1])))) // psi + vec[1] * f1
   psi = psi.add(f1.multiplyScalar(vec1[1]))
  //  console.log('psi ', 1, psi.join("      "));

   //     psi=psi+vec(m)*f2

   // do m=2,niter-1
   for (let m = 2; m <= niter - 1; m++) {
      // console.log('Second Lanczos iteration: ', m)
      hamoperation(l**d, f1, f2)
      // console.log('L2 lanczos2 Ham f1: ', f1.join("      "))
      // console.log('L2 lanczos2 Ham f2: ', f2.join("      "))

      // console.log('L2 lanczos2 params: ', aa[m-1], nn[m-1], nn[m])

      // f2 = (f2 - aa[m-1] * f1 - nn[m-1] * f0) / nn[m]
      // f2 = f2.map(subtract(f1.map(f1.map(multiplyScalar(aa[m-1])))).map(subtract(f0.map(multiplyScalar(nn[m-1]))))).map(multiplyScalar(1/nn[1])) // f2 - a[m - 1] * f1 -nn[m-1] * f0
      f2 = f2.subtract(f1.multiplyScalar(aa[m - 1])).subtract(f0.multiplyScalar(nn[m-1])).multiplyScalar(1/nn[m]);
      // console.log('L2 lanczos2 subtract f2: ', f2.join("      "));
      // psi = psi.map(add(f2.map(multiplyScalar(vec[m])))) // psi + vec[m] * f2
      // console.log('hey what about this ');
      // console.log('L2 vec[m]: ', m, vec1[m]);
      // console.log('L2 f2 ', f2);
      // console.log('psi before ', m, psi.join("      "));

      // psi = psi.add(vec[m].multiply(f2))
      psi = psi.add(f2.multiplyScalar(vec1[m]))
      // console.log('psi ', m, psi.join("      "));

      // f0 = f1
      // f1 = f2
      f0 = f1.clone()
      f1 = f2.clone()
      // console.log("L2 CHECK:", [m, f0[0], f1[0], f2[0]].join("      "))
   }
}

/*
!-------------------------------------------------------!
! Acting with H on a state vector f1(), leading to f2().
!-------------------------------------------------------!
*/
function hamoperation(n,f1,f2) {
  // console.log('Ham vpot: ',vpot)
  // console.log('0 Ham f1: ', JSON.stringify(f1))
  // f1 = [...f1]
  // console.log('1 Ham f1: ', JSON.stringify(f1))

 vpot.multiply(f1).copy(f2) // f2 = vpot * f1
//  console.log('Ham f2: ',JSON.stringify(f2))

 if (d==1) {
    for (let j = 0; j < n; j++) { // do j=1,n
       if (j != 0) {f2[j]=f2[j]-f1[j-1]}
       if (j != n - 1) {f2[j]=f2[j]-f1[j+1]}
    }
  } else if (d==2) {
    // console.log('--> Ham f1: ', JSON.stringify(f1))

   for (let j = 0; j < l**2; j++) { //do j=1,l**2
      const x = 1 + j % l // 1 + mod(j-1,l)
      const y = Math.floor(1 + j / l)
       if (x != 1) {f2[j]=f2[j]-f1[j-1]}
       if (x != l) {f2[j]=f2[j]-f1[j+1]}
       if (y != 1) {f2[j]=f2[j]-f1[j-l]}
       if (y != l) {f2[j]=f2[j]-f1[j+l]}
      //  console.log("x, y :", x, y)
// console.log('--> Ham f1: ', JSON.stringify(f1))
// console.log('--> Ham f2: ',JSON.stringify(f2))
      
   }
  } else if (d==3) {
    const ll = l**2
    for (let j = 0; j < n; j++) { // do j=1,n
      const x = 1 + j % l
      const y = 1 + (j % ll) / l // 1+mod(j-1,ll)/l
      const z = Math.floor(1 + j / ll)
      console.log("x, y, z :", x, y, z)

       if (x != 1) {f2[j]=f2[j]-f1[j-1]}
       if (x != l) {f2[j]=f2[j]-f1[j+1]}
       if (y != 1) {f2[j]=f2[j]-f1[j-l]}
       if (y != l) {f2[j]=f2[j]-f1[j+l]}
       if (z != 1) {f2[j]=f2[j]-f1[j-ll]}
       if (z != l) {f2[j]=f2[j]-f1[j+ll]}
    }
  }
  // console.log('Ham f2 done: ', f2.join("      "))

}

 function diatri(n) {

  const d = aa.slice(0)
  const e = nn.slice(1, n)

  const work = new Vector(Math.max(1, 2 * n - 2))
  const inf = 0
  // console.log('call dstev',n)
  // console.log('  nn',nn)
  // console.log('  aa',aa)
  // console.log('  d',d)
  // console.log('  e',e)
  // console.log('  vec',vec)
  // console.log('  work',work)
  // console.log('  inf',inf)
 
  const A = new Array(n).fill().map(x => new Array(n).fill(0))
  d.forEach((x, i) => A[i][i] = x)
  e.forEach((x, i) => {
    A[i + 1][i] = x
    A[i][i + 1] = x
  })
  // const prettyA = A.map(row => row.map(x => x.toPrecision(2)))
  // console.log("the eigs", prettyA, eigs(A))
  const eigen = math.eigs(A) // from {values, vectors}
  //copy eigen.values into eig and eigen.vectors into vec
  eigen.values.forEach((x, i) => eig[i] = x)
  eigen.vectors.forEach((v, i) => vec[i] = new Vector(v))

  // console.log("EIGEN", {vec})
  return eigen.values
//  use lanczosvectors

//  integer :: n,inf
//  real(8) :: d(n),e(n),eig(n),vec(n,n),work(max(1,2*n-2))

//  d=aa(0:n-1)
//  e=nn(1:n)
//  call dstev('V',n,d,e,vec,n,work,inf)
//  eig=d

}

function mulberry32(seed) {
  return function() {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

let mulberryRan = null

function ran() {
  // return theRans[randex++] ?? Math.random()
  // return Math.random()
  return mulberryRan()
}

  


// real(8) function ran()
// !----------------------------------------------!
// ! 64-bit congruental generator                 !
// ! iran64=oran64*2862933555777941757+1013904243 !
// !----------------------------------------------!
//  implicit none

//  real(8)    :: dmu64
//  integer(8) :: ran64,mul64,add64
//  common/bran64/dmu64,ran64,mul64,add64

//  ran64=ran64*mul64+add64
//  ran=0.5d0+dmu64*dble(ran64)

//  end function ran
// !----------------!






 function initstate(f,n) {
    // console.log("INIT STATE:", f, n)
  for (let i=0; i < n; i++) {
   f[i] = ran() - 0.5
  }
  // const norm = 1 / Math.sqrt(dot(f,f))
  const norm = 1 / Math.sqrt(f.dot(f))
  for (let i=0; i < n; i++) {
   f[i] = f[i] * norm
  }
}



/*
!-------------------------------------------!
!multiply actual potential energy by escale !
!-------------------------------------------!
*/
function potentialenergy(escale) {
  const vpotLen = vpot.length
  for (let i = 0; i < vpotLen; i++) {
    const yInt = Math.floor(i / l)
    const xInt = i - yInt * l
    const x = xInt / l
    const y = yInt / l
    vpot[i] = vpotF(x, y)
  }

  vpot = vpot.multiplyScalar(escale)
  for (let i = 0; i < vpotLen; i++) {
    vpot[i] += 2 * d
  }

  //  real(8) :: escale

//  allocate(vpot(l**d))
//  vpot(:)=0.d0  //! no potential here; this is implemented by user
//  vpot(:)=vpot(:)*escale
//  vpot(:)=vpot(:)+2.d0*d

}

export class Lanczos {
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