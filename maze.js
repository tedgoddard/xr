export class Maze {

  simple(width, height, density = 0.2) {
    const result = []
    for (let i = 0; i < height; i++) {
      const row = []
      for (let j = 0; j < width; j++) {
        row.push(Math.floor(Math.random() + density))
      }
      result.push(row)
    }
    return result
  }

}
