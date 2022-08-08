import { Shape, MathUtils } from './js/three.module.js'

export class PathShape extends Shape {

	constructor(path) {
		super()
		this.path = path
	}

	getPointsHoles(divisions) {
		return []
	}

	extractPoints(divisions) {
		return {
			shape: this.path.getPoints(divisions),
			holes: []
		}
	}

	copy(source) {
		super.copy(source)
		this.path = source.path
		return this
	}

	// toJSON() {

	// 	const data = super.toJSON();

	// 	data.uuid = this.uuid;
	// 	data.holes = [];

	// 	for ( let i = 0, l = this.holes.length; i < l; i ++ ) {

	// 		const hole = this.holes[ i ];
	// 		data.holes.push( hole.toJSON() );

	// 	}

	// 	return data;

	// }

	// fromJSON( json ) {

	// 	super.fromJSON( json );

	// 	this.uuid = json.uuid;
	// 	this.holes = [];

	// 	for ( let i = 0, l = json.holes.length; i < l; i ++ ) {

	// 		const hole = json.holes[ i ];
	// 		this.holes.push( new Path().fromJSON( hole ) );

	// 	}

	// 	return this;

	// }

}
