#version 300 es

in vec2 vTextureCoord;

out vec4 finalColor;

uniform sampler2D uTexture;
uniform vec2 uP1;
uniform vec2 uP2;
uniform vec2 uP3;
uniform float uTime;

float random(in vec2 _st) {
    return fract(sin(dot(_st.xy, vec2(12.9898f, 78.233f))) *
        43758.5453123f);
}

vec3 hsv2rgb(in vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x * 6.0f + vec3(0.0f, 4.0f, 2.0f), 6.0f) - 3.0f) - 1.0f, 0.0f, 1.0f);
    rgb = rgb * rgb * (3.0f - 2.0f * rgb);
    return c.z * mix(vec3(1.0f), rgb, c.y);
}


float random(float x) {
    return fract(sin(x) * 43758.5453123f);
}

void main(void) {
    vec2 coord = vTextureCoord;
    float d1 = 2.0 * distance(uP1, coord);
    float d2 = 2.0 * distance(uP2, coord);
    float d3 = 1.0 - distance(uP3, coord);
    float mind = 0.5 * min(d1 + sin(uTime * 0.01), min(d2 + cos(uTime * 0.01), 
        d3 + sin(uTime * 0.01f + 0.12)));
    vec3 rainbow1 = hsv2rgb(vec3(d1 + 0.2 * cos(uTime * 0.01), 0.8f, 0.5f));
    vec3 rainbow2 = hsv2rgb(vec3(d2 + 0.5, 0.7f, 0.3f));
    vec3 rainbow3 = hsv2rgb(vec3(d3, 0.9f, 0.7f));
    vec3 rainbow4 = vec3(d3, d1, d2);


    vec4 color = 0.5 * vec4((rainbow1 + rainbow2 + rainbow3 + rainbow4) * 0.5, 1.0f);
    finalColor = color * step(vec4(0.01), texture(uTexture, coord));
}