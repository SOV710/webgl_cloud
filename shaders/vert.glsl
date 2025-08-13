#version 300 es
const vec2 POS[3] = vec2[3](vec2(-1,-1), vec2(3,-1), vec2(-1,3));
void main(){ gl_Position = vec4(POS[gl_VertexID], 0.0, 1.0); }
