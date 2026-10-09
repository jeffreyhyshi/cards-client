import  { Application, Filter, PI_2 } from "pixi.js";
import wavyVertex from "../shaders/wavyVertex.glsl?raw";
import wavyFrag from "../shaders/wavyFrag.glsl?raw";
import oilSlickVertex from "../shaders/oilSlickVertex.glsl?raw";
import oilSlickFrag from "../shaders/oilSlickFrag.glsl?raw";

export class Filters {
    private static _wavyFilter?: Filter;
    private static _oilSlickFilter?: Filter;

    static wavyFilter(app: Application): Filter {
        if (!this._wavyFilter) {
            this._wavyFilter = Filter.from({
                gl: {
                    fragment: wavyFrag,
                    vertex: wavyVertex
                },
                resources: {
                    waveUniforms: {
                        uWaveAmplitude: { value: 0.05, type: 'f32' },
                        uWaveFrequency: { value: 10.0, type: 'f32' },
                        uTime: { value: 0.0, type: 'f32' },
                    },
                },
            });
            app.ticker.add((ticker) => {
                this._wavyFilter!.resources.waveUniforms.uniforms.uTime += 0.2 * ticker.deltaTime;
            });
        }
        
        return this._wavyFilter;
    }

    static oilSlickFilter(app: Application): Filter {
        if (!this._oilSlickFilter) {
            this._oilSlickFilter = Filter.from({
                gl: {
                    fragment: oilSlickFrag,
                    vertex: oilSlickVertex
                },
                resources: {
                    oilSlickUniforms: {
                        uP1: { value: [Math.random(), Math.random()], type: 'vec2<f32>' },
                        uP2: { value: [Math.random(), Math.random()], type: 'vec2<f32>' },
                        uP3: { value: [Math.random(), Math.random()], type: 'vec2<f32>'},
                        uA1: { value: Math.random() * PI_2, type: "f32"},
                        uA2: { value: Math.random() * PI_2, type: "f32" },
                        uA3: { value: Math.random() * PI_2, type: "f32" },
                        uTime: { value: 0.0, type: 'f32' },
                    },
                },
            });
            app.ticker.add((ticker) => {
                this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA1 = this.randomWalkWithAngle(
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uP1,
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA1,
                    0.001
                );
                this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA2 = this.randomWalkWithAngle(
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uP2,
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA2,
                    0.002
                );
                this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA3 = this.randomWalkWithAngle(
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uP3,
                    this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uA3,
                    0.0015
                );
                this._oilSlickFilter!.resources.oilSlickUniforms.uniforms.uTime += 0.1 * ticker.deltaTime;

            });
        }
        return this._oilSlickFilter;
    }

    private static randomWalk(prev: number[], stepSize: number) {
        let ind = Math.floor(Math.random() * prev.length);
        let next = Math.min(Math.max(prev[ind]! + Math.sign(Math.random() - 0.5) * stepSize, 0.0), 1.0);
        prev[ind]! = next;
    }

    private static randomWalkWithAngle(prev: number[], prevAngle: number, stepSize: number): number {
        let nextAngle = prevAngle + Math.sign(Math.random() - 0.5) * 0.1;
        let xInc = Math.cos(nextAngle) * stepSize;
        let yInc = Math.sin(nextAngle) * stepSize;
        let nextX = Math.min(Math.max(prev[0]! + xInc, 0.0), 1.0);
        let nextY = Math.min(Math.max(prev[1]! + yInc, 0.0), 1.0);
        if (nextX <= 0 || nextX >= 1 || nextY <= 0 || nextY >= 1) {
            nextAngle = nextAngle - PI_2 / 6;
        }
        prev[0] = nextX;
        prev[1] = nextY;
        return nextAngle;
    }
}