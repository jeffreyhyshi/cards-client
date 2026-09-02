import  { Application, Filter } from "pixi.js";
import wavyVertex from "../shaders/wavyVertex.glsl?raw";
import wavyFrag from "../shaders/wavyFrag.glsl?raw";

export class Filters {
    private static _wavyFilter?: Filter;

    static wavyFilter(app: Application) {
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
}