import { VRRoom } from "./vrroom.js"
import * as THREE from './js/three.module.js';

const vrRoom = new VRRoom()
const scene = vrRoom.scene
let model
window.vrRoom = vrRoom
window.THREE = THREE

let mainMesh = null


const sprite = new THREE.TextureLoader().load("images/disc.png")
const cloneGeometry = new THREE.BufferGeometry()
// cloneGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
const cloneMaterial = new THREE.PointsMaterial({ size: 1, sizeAttenuation: false, map: sprite, color: 0xff0000 })
const clone = new THREE.Points(cloneGeometry, cloneMaterial)
clone.position.x = 6
scene.add(clone)

const boxSize = 1
let adjacentIterations = 500000
const computeAdjacents = true
const skipSkinny = 0.09

const geometry = new THREE.BoxGeometry( boxSize, boxSize, boxSize )
const material = new THREE.MeshBasicMaterial( {color: 0x00ff00, opacity: 0.3, transparent: true} )
const cursor = new THREE.Mesh( geometry, material )
cursor.position.x = 0
cursor.position.y = 0
cursor.position.z = 0
scene.add(cursor)

const moveCursor = {
  w: () => { cursor.position.x -= boxSize },
  a: () => { cursor.position.z += boxSize },
  s: () => { cursor.position.x += boxSize },
  d: () => { cursor.position.z -= boxSize },
  q: () => { cursor.position.y -= boxSize },
  e: () => { cursor.position.y += boxSize },
  ",": () => { adjacentIterations += 1 },
  ".": () => { adjacentIterations -= 1 },
}

document.onkeydown = (event) => {
  console.log(event.key)
  moveCursor[event.key]()
  processMesh(mainMesh)
}

function nearCursor(point) {
  const [x, y, z] = point
  if (Math.abs(cursor.position.x - x) > boxSize) { return false }
  if (Math.abs(cursor.position.y - y) > boxSize) { return false }
  if (Math.abs(cursor.position.z - z) > boxSize) { return false }
  return true
}

function uniq(list) {
  return Array.from(new Set(list))
}

function uvRect(list) {
  const ranges = { x: [1000, -1000], y: [1000, -1000] }
  for (const uv of list) {
    const [x, y] = uv.split ? uv.split(",").map(parseFloat) : uv
    ranges.x[0] = Math.min(ranges.x[0], x)
    ranges.x[1] = Math.max(ranges.x[1], x)
    ranges.y[0] = Math.min(ranges.y[0], y)
    ranges.y[1] = Math.max(ranges.y[1], y)
  }
  return {
    x: ranges.x[0],
    y: ranges.y[0],
    w: ranges.x[1] - ranges.x[0],
    h: ranges.y[1] - ranges.y[0],
  }
}

function vBox(list) {
  const ranges = { x: [1000, -1000], y: [1000, -1000], z: [1000, -1000] }
  for (const v of list) {
    const [x, y, z] = v.split ? v.split(",").map(parseFloat) : v
    ranges.x[0] = Math.min(ranges.x[0], x)
    ranges.x[1] = Math.max(ranges.x[1], x)
    ranges.y[0] = Math.min(ranges.y[0], y)
    ranges.y[1] = Math.max(ranges.y[1], y)
    ranges.z[0] = Math.min(ranges.z[0], z)
    ranges.z[1] = Math.max(ranges.z[1], z)
  }
  return {
    x: ranges.x[0],
    y: ranges.y[0],
    z: ranges.z[0],
    w: ranges.x[1] - ranges.x[0],
    h: ranges.y[1] - ranges.y[0],
    d: ranges.z[1] - ranges.z[0],
  }
}

function processMesh(object) {
  const debugVerts = []
  if (object.geometry?.getAttribute) {
    mainMesh = object
    const position = object.geometry.getAttribute("position")
    console.log(object)
    const pranges = { x: [1000, -1000], y: [1000, -1000], z:[1000, -1000] }
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)
      pranges.x[0] = Math.min(pranges.x[0], x)
      pranges.x[1] = Math.max(pranges.x[1], x)
      pranges.y[0] = Math.min(pranges.y[0], y)
      pranges.y[1] = Math.max(pranges.y[1], y)
      pranges.z[0] = Math.min(pranges.z[0], z)
      pranges.z[1] = Math.max(pranges.z[1], z)
    }
    console.log(pranges)

    const uv = object.geometry.getAttribute("uv")
    const toUV = indexes => indexes.map( j => [uv.getX(j), uv.getY(j)] )
    const uvranges = { u: [10000, -10000], v: [10000, -10000] }
    let count = 0
    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)

      if (Math.abs(cursor.position.x - x) > boxSize) { continue }
      if (Math.abs(cursor.position.y - y) > boxSize) { continue }
      if (Math.abs(cursor.position.z - z) > boxSize) { continue }

      count += 1
      // debugVerts.push(x, y, z)
      uvranges.u[0] = Math.min(uvranges.u[0], u)
      uvranges.u[1] = Math.max(uvranges.u[1], u)
      uvranges.v[0] = Math.min(uvranges.v[0], v)
      uvranges.v[1] = Math.max(uvranges.v[1], v)
    }
    console.log(count, JSON.stringify(uvranges))

    const c = document.getElementById("pip");
    const ctx = c.getContext("2d");
    const img = object.material.map.image
    const w = img.width
    const h = img.height
    const pip = { w: 400, h: 400 }
    const ud = uvranges.u[1] - uvranges.u[0]
    const vd = uvranges.v[1] - uvranges.v[0]
    // ctx.drawImage(img, uvranges.u[0] * w, uvranges.v[0] * h, ud * w, vd * h, 0, 0, 100, 100);
    ctx.drawImage(img, 0, 0, pip.w, pip.h)
  

    //iterate through the triangles. find any vertex in a vertex set. if a triangle joins two vertex sets, merge them, otherwise adda  new one or add to the one it matches
    const triangles = object.geometry.index
    const adjacents = { }
    const edges = new Set()
const debugAdjacent = []
    if (triangles) {
      console.log(`processing ${triangles.count} triangles at`, cursor.position)
      for (let i = 0; i < triangles.count; i++) {
      // for (let i = 0; i < 10; i++) {

        // if (uniq(Object.values(adjacents)).length > 3) {
        //   continue
        // }
        const triangle = [triangles.getX(i), triangles.getY(i), triangles.getZ(i)]
        const tuv = toUV(triangle)
        const tx = triangle.map( j => [position.getX(j), position.getY(j), position.getZ(j)] )
        let skip = false
        
        // if (!tx.find(nearCursor)) {
        //   continue
        // }


        for (const x of tx) {
          if (!nearCursor(x)) {
            skip = true
          }
        }
        if (skip) {
          continue
        }
/*
        const tuvs = tuv.map( w => w.join() )
        const tclosure = uniq(tuvs.map( w => [w, ...(adjacents[w] ?? [])] ).flat())
        for (const uv of tclosure) {
          adjacents[uv] = tclosure
        }
*/
        if (skipSkinny) {
          const trect = uvRect(tuv)
          if (trect.w > skipSkinny || trect.h > skipSkinny) {
            debugVerts.push(...tx.flat())      
            continue
          }
        }

        debugAdjacent.push({ tuv, tx })

        if (computeAdjacents && Object.values(adjacents).length < adjacentIterations) {
          /*
          const tuvs = tuv.map( w => w.join() )
          const tneighbors =  tuvs.map( uv => adjacents[uv] ?? [] )
          const tclosure = uniq([...tneighbors, tuvs].flat())
          console.log({tuvs, tneighbors, tclosure})
          for (const uv of tuvs) {
            adjacents[uv] = tclosure
          }
          */
          // console.log(triangle)
          const tneighbors =  triangle.map( w => adjacents[w] ?? [] )
          const tclosure = uniq([...tneighbors, triangle].flat())
          // console.log({triangle, tneighbors, tclosure})
          for (const w of tclosure) {
            adjacents[w] = tclosure
          }
        //  console.log("Computed adjacents", adjacents)
        }
        // const tedges = tuvs.map( (uv, i) => [uv, tuvs[(i + 1) % 3]].sort() )


        /*
        let union = []
        for (const coord of tuvs) {
          //each component turns into a cloud of points?
          union = [...union, ...adjacents[coord]]
        }
        union = Array.from
        for (const coord of tuvs) {
          //each component turns into a cloud of points?
          adjacents[coord] = new Set([...Array.from(a), ...tuvs])
        }
        */
        // if (i % 2 == 0) {
        //   console.log(`${i} triangles make components ${uniq(Object.values(adjacents)).length}`, uniq(Object.values(adjacents)))
        // }
      }

      // for (let i = 0; i < position.count; i++) {
      //   const common = triangles.foreach( (point, j) => { j - j % 3} )
      //   // const triangle = triangles.slice(i, i + 2)
      // }
    }
  
    const componentsCoords = uniq(Object.values(adjacents).map(uniq))
    console.log({componentsCoords})
    // const components = uniq(Object.values(adjacents))
    // const rects = components.map(uvRect)
    // const rects = uniq(componentsCoords.map(uvRect))

     console.log( componentsCoords.map( c => toUV(c) ))
    const rects = componentsCoords.map( c => toUV(c) ).map(uvRect)
    console.log({adjacents, rects})

    ctx.fillStyle = "#FF0000"
    ctx.strokeStyle = "#FF0000"
    for (const rect of rects) {
      // console.log("rect", rect)
      ctx.strokeRect(rect.x * pip.w, rect.y * pip.h, rect.w * pip.w, rect.h * pip.h)
    }


    /* mark the uv points green for all the 3D points
    ctx.fillStyle = "#00FF00"

    for (let i = 0; i < uv.count; i++) {
      const u = uv.getX(i)
      const v = uv.getY(i)
      const x = position.getX(i)
      const y = position.getY(i)
      const z = position.getZ(i)

      if (Math.abs(cursor.position.x - x) > boxSize) { continue }
      if (Math.abs(cursor.position.y - y) > boxSize) { continue }
      if (Math.abs(cursor.position.z - z) > boxSize) { continue }

      ctx.fillRect(u * pip.w, v * pip.h, 2, 2)
    }
    */


//take a rectangle around each connected component of triangles and draw those rectangles sequentially to make a new texture map


    // const geometry = new THREE.BoxGeometry( ranges.x[1] - ranges.x[0], ranges.y[1] - ranges.y[0], ranges.z[1] - ranges.z[0] )
    // const material = new THREE.MeshBasicMaterial( {color: 0x00ff00, opacity: 0.3, transparent: true} )
    // const cube = new THREE.Mesh( geometry, material )
    // object.add( cube )
    

    ctx.fillStyle = "#00AAFF"
    ctx.strokeStyle = "#00AAFF"
    ctx.lineWidth = 0.5
    console.log("BLUE DOTS", debugAdjacent)
    for (const triangle of debugAdjacent) {
      const { tuv, tx } = triangle
      ctx.beginPath()
      ctx.moveTo(tuv[0][0] * pip.w, tuv[0][1] * pip.h)
      ctx.lineTo(tuv[1][0] * pip.w, tuv[1][1] * pip.h)
      ctx.lineTo(tuv[2][0] * pip.w, tuv[2][1] * pip.h)
      ctx.closePath()
      const trect = uvRect(tuv)
      const box = vBox(tx)
      ctx.strokeStyle = "#00AAFF"
      if (trect.w > 0.1 || trect.h > 0.1) {
        ctx.strokeStyle = "#FF0000"
      }
      ctx.stroke()


      // ctx.fill()
    }
    ctx.fillStyle = "#00FF00"
    for (const triangle of debugAdjacent) {
      const { tuv, tx } = triangle
      for (const p of tuv) {
        ctx.fillRect(p[0] * pip.w, p[1] * pip.h, 1, 1)
      }
    }
    console.log(debugVerts)
    cloneGeometry.setAttribute("position", new THREE.BufferAttribute( new Float32Array(debugVerts), 3 ) )
  }
}

function removeMetal(object) {
  const material = object.material ?? { }
  material.metalness = 0

  processMesh(object)

  const children = object.children ?? []
  for (let child of children) {
    removeMetal(child)
  }
}

async function loadModel() {
  model = new THREE.Object3D()
  const modelName = document.location.search.substring(1)
  const glbModel = await vrRoom.loadModel(`models/${modelName}`)
window.glbModel = glbModel
  removeMetal(glbModel)
  model.add(glbModel)
  scene.add(model)
  model.position.set(0, 0, 0)
}

async function init() {
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  scene.add(directionalLight)
  const ambientLight = new THREE.AmbientLight(0x404040)
  scene.add(ambientLight)

  await loadModel()
}

init().then()






// a, b, c
// (b - a), (c - b), (a - c)
// (b - a) * (c - b), (c - b) * (a - c), (a - c) * (b - a)
// b*c - b*b - a*c + a*b + 
// a*c - c*c - a*b + b*c + 
// a*b - a*a - b*c + a*c + 

// a*b + b*c + a*c     - b*b - c*c - a*a
