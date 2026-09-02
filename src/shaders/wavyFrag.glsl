#version 300 es

in vec2 vTextureCoord;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uWaveAmplitude;
uniform float uWaveFrequency;
uniform float uTime;

void main(void) {
    vec2 coord = vTextureCoord;
    coord.x += sin(coord.y * uWaveFrequency + uTime) * uWaveAmplitude;
    finalColor = texture(uTexture, coord);
}