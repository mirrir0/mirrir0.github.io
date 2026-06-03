import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uColorNum;
  uniform float uPixelSize;
  varying vec3 vNormal;
  varying vec3 vViewPos;

  float bayer(vec2 p) {
    int x = int(mod(p.x, 8.0)), y = int(mod(p.y, 8.0));
    float m[64];
    m[0]=0.0;  m[1]=0.75; m[2]=0.1875; m[3]=0.9375; m[4]=0.046875; m[5]=0.796875; m[6]=0.234375; m[7]=0.984375;
    m[8]=0.5;  m[9]=0.25; m[10]=0.6875; m[11]=0.4375; m[12]=0.546875; m[13]=0.296875; m[14]=0.734375; m[15]=0.484375;
    m[16]=0.125; m[17]=0.875; m[18]=0.0625; m[19]=0.8125; m[20]=0.171875; m[21]=0.921875; m[22]=0.109375; m[23]=0.859375;
    m[24]=0.625; m[25]=0.375; m[26]=0.5625; m[27]=0.3125; m[28]=0.671875; m[29]=0.421875; m[30]=0.609375; m[31]=0.359375;
    m[32]=0.03125; m[33]=0.78125; m[34]=0.21875; m[35]=0.96875; m[36]=0.015625; m[37]=0.765625; m[38]=0.203125; m[39]=0.953125;
    m[40]=0.53125; m[41]=0.28125; m[42]=0.71875; m[43]=0.46875; m[44]=0.515625; m[45]=0.265625; m[46]=0.703125; m[47]=0.453125;
    m[48]=0.15625; m[49]=0.90625; m[50]=0.09375; m[51]=0.84375; m[52]=0.140625; m[53]=0.890625; m[54]=0.078125; m[55]=0.828125;
    m[56]=0.65625; m[57]=0.40625; m[58]=0.59375; m[59]=0.34375; m[60]=0.640625; m[61]=0.390625; m[62]=0.578125; m[63]=0.328125;
    return m[y * 8 + x] - 0.25;
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 L = normalize(vec3(0.4, 0.8, 1.0));
    vec3 V = normalize(vViewPos);
    vec3 H = normalize(L + V);
    float diff = max(dot(N, L), 0.0);
    float spec = pow(max(dot(N, H), 0.0), 32.0);
    vec3 color = uColor * (0.15 + 0.7 * diff) + vec3(0.25) * spec;
    color = pow(color, vec3(1.0 / 1.4));
    float step = 1.0 / (uColorNum - 1.0);
    vec2 pixelCoord = floor(gl_FragCoord.xy / uPixelSize) * uPixelSize;
    vec3 dithered = color + bayer(pixelCoord) * step;
    dithered = clamp(dithered - 0.15, 0.0, 1.0);
    vec3 result = floor(dithered * (uColorNum - 1.0) + 0.5) / (uColorNum - 1.0);
    gl_FragColor = vec4(result, 1.0);
  }
`;

function WavePlane({
  waveColor, frequency, amplitude, speed, colorNum, pixelSize,
}: {
  waveColor: [number, number, number]; frequency: number; amplitude: number; speed: number;
  colorNum: number; pixelSize: number;
}) {
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const originalsRef = useRef<Float32Array | null>(null);

  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(...waveColor) },
    uColorNum: { value: colorNum },
    uPixelSize: { value: pixelSize },
  }), []);

  useFrame((_state, _delta) => {
    const geo = geoRef.current;
    if (!geo) return;
    const pos = geo.attributes.position;
    if (!pos) return;
    if (!originalsRef.current) originalsRef.current = new Float32Array(pos.array);

    const orig = originalsRef.current;
    const arr = pos.array as Float32Array;
    const t = performance.now() * 0.001 * speed;

    for (let i = 0; i < pos.count; i++) {
      const x = orig[i * 3]!, y = orig[i * 3 + 1]!, z = orig[i * 3 + 2]!;
      const noise =
        Math.sin(x * frequency + t) *
        Math.cos(y * frequency * 0.7 + t * 1.3) *
        Math.sin((x + y) * frequency * 0.3 + t * 0.7);
      arr[i * 3 + 2] = z + noise * amplitude;
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const u = uniforms as Record<string, THREE.IUniform>;
    (u.uColor!.value as THREE.Color).set(...waveColor);
    u.uColorNum!.value = colorNum;
    u.uPixelSize!.value = pixelSize;
  });

  return (
    <mesh>
      <planeGeometry ref={geoRef} args={[12, 12, 80, 80]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={`varying vec3 vNormal; varying vec3 vViewPos; void main() { vNormal = normalize(mat3(modelMatrix) * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vViewPos = -mv.xyz; gl_Position = projectionMatrix * mv; }`}
        fragmentShader={FRAGMENT}
      />
    </mesh>
  );
}

export default function Dither({
  waveColor = [0.2, 0.7, 0.4],
  waveFrequency = 5.1,
  waveAmplitude = 0.45,
  mouseRadius = 0,
  colorNum = 2.5,
  pixelSize = 1,
  waveSpeed = 0.5,
}: Record<string, unknown>) {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }} dpr={1}>
      <WavePlane
        waveColor={waveColor as [number, number, number]}
        frequency={waveFrequency as number}
        amplitude={waveAmplitude as number}
        speed={waveSpeed as number}
        colorNum={colorNum as number}
        pixelSize={pixelSize as number}
      />
    </Canvas>
  );
}
