// Лента за курсором: порт React Bits <Ribbons /> на ванильный JS.
// Обычный скрипт (работает и с file://): WebGL-библиотека ogl лежит
// в javascripts/vendor/ogl.js и отдаёт классы через глобал window.ogl.
// Слой фиксирован поверх всей страницы и пропускает клики; цвет ленты
// следует за темой фона (белый → розовый акцент, розовый → чёрный,
// тёмный → белый). Выключается на таче и при prefers-reduced-motion.
const REDUCE_MOTION = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;
const FINE_POINTER = window.matchMedia('(pointer: fine)').matches;

if (!REDUCE_MOTION && FINE_POINTER && window.ogl) {
  initRibbons();
}

function initRibbons() {
  const { Renderer, Transform, Vec3, Color, Polyline } = window.ogl;

  // настройки ленты (пропсы оригинального компонента);
  // толщина задаётся долей ширины экрана — правило проекта «никаких px»
  const CONFIG = {
    ribbonCount: 1,
    baseSpring: 0.03,
    baseFriction: 0.9,
    thicknessFactor: 11 / 1440, // ≈11px на макете 1440
    offsetFactor: 0.02,
    maxAge: 500,
    pointCount: 50,
    speedMultiplier: 0.5,
    enableFade: false,
    enableShaderEffect: true,
    effectAmplitude: 2
  };

  // цвет ленты для каждой темы фона
  const THEME_COLORS = {
    white: '#ff2298', // на белом — акцентный розовый
    pink: '#121212', // на розовом — чёрный (как остальные акценты)
    dark: '#ffffff' // на тёмном — белый
  };
  const themeColor = () => {
    if (document.body.classList.contains('theme-pink')) {
      return THEME_COLORS.pink;
    }
    if (document.body.classList.contains('theme-dark')) {
      return THEME_COLORS.dark;
    }
    return THEME_COLORS.white;
  };

  const container = document.createElement('div');
  container.className = 'ribbons';
  document.body.appendChild(container);

  const renderer = new Renderer({
    dpr: Math.min(2, window.devicePixelRatio || 2),
    alpha: true
  });
  const gl = renderer.gl;
  gl.clearColor(0, 0, 0, 0);

  gl.canvas.style.position = 'absolute';
  gl.canvas.style.top = '0';
  gl.canvas.style.left = '0';
  gl.canvas.style.width = '100%';
  gl.canvas.style.height = '100%';
  container.appendChild(gl.canvas);

  const scene = new Transform();
  const lines = [];

  const vertex = `
    precision highp float;

    attribute vec3 position;
    attribute vec3 next;
    attribute vec3 prev;
    attribute vec2 uv;
    attribute float side;

    uniform vec2 uResolution;
    uniform float uDPR;
    uniform float uThickness;
    uniform float uTime;
    uniform float uEnableShaderEffect;
    uniform float uEffectAmplitude;

    varying vec2 vUV;

    vec4 getPosition() {
        vec4 current = vec4(position, 1.0);
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);
        vec2 nextScreen = next.xy * aspect;
        vec2 prevScreen = prev.xy * aspect;
        vec2 tangent = normalize(nextScreen - prevScreen);
        vec2 normal = vec2(-tangent.y, tangent.x);
        normal /= aspect;
        normal *= mix(1.0, 0.1, pow(abs(uv.y - 0.5) * 2.0, 2.0));
        float dist = length(nextScreen - prevScreen);
        normal *= smoothstep(0.0, 0.02, dist);
        float pixelWidthRatio = 1.0 / (uResolution.y / uDPR);
        float pixelWidth = current.w * pixelWidthRatio;
        normal *= pixelWidth * uThickness;
        current.xy -= normal * side;
        if(uEnableShaderEffect > 0.5) {
          current.xy += normal * sin(uTime + current.x * 10.0) * uEffectAmplitude;
        }
        return current;
    }

    void main() {
        vUV = uv;
        gl_Position = getPosition();
    }
  `;

  const fragment = `
    precision highp float;
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uEnableFade;
    varying vec2 vUV;
    void main() {
        float fadeFactor = 1.0;
        if(uEnableFade > 0.5) {
            fadeFactor = 1.0 - smoothstep(0.0, 1.0, vUV.y);
        }
        gl_FragColor = vec4(uColor, uOpacity * fadeFactor);
    }
  `;

  const ribbonThickness = () => window.innerWidth * CONFIG.thicknessFactor;

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    lines.forEach((line) => {
      line.polyline.resize();
      line.polyline.mesh.program.uniforms.uThickness.value = ribbonThickness();
    });
  }
  window.addEventListener('resize', resize);

  const center = (CONFIG.ribbonCount - 1) / 2;
  for (let index = 0; index < CONFIG.ribbonCount; index++) {
    const spring = CONFIG.baseSpring + (Math.random() - 0.5) * 0.05;
    const friction = CONFIG.baseFriction + (Math.random() - 0.5) * 0.05;
    const mouseOffset = new Vec3(
      (index - center) * CONFIG.offsetFactor + (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.1,
      0
    );

    const line = {
      spring,
      friction,
      mouseVelocity: new Vec3(),
      mouseOffset
    };

    const points = [];
    for (let i = 0; i < CONFIG.pointCount; i++) {
      points.push(new Vec3());
    }
    line.points = points;

    line.polyline = new Polyline(gl, {
      points,
      vertex,
      fragment,
      uniforms: {
        uColor: { value: new Color(themeColor()) },
        uThickness: { value: ribbonThickness() },
        // лента невидима, пока курсор не шевельнулся
        uOpacity: { value: 0.0 },
        uTime: { value: 0.0 },
        uEnableShaderEffect: { value: CONFIG.enableShaderEffect ? 1.0 : 0.0 },
        uEffectAmplitude: { value: CONFIG.effectAmplitude },
        uEnableFade: { value: CONFIG.enableFade ? 1.0 : 0.0 }
      }
    });
    line.polyline.mesh.setParent(scene);
    lines.push(line);
  }

  resize();

  // тема сменилась — плавно перекрашиваем ленту (лерп в цикле отрисовки)
  let targetColor = new Color(themeColor());
  new MutationObserver(() => {
    targetColor = new Color(themeColor());
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });

  const mouse = new Vec3();
  let started = false;
  function updateMouse(e) {
    mouse.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      (e.clientY / window.innerHeight) * -2 + 1,
      0
    );
    if (!started) {
      // первый кадр: собираем хвост в точке курсора, чтобы лента
      // не выстреливала из центра экрана
      started = true;
      lines.forEach((line) => {
        line.points.forEach((p) => p.copy(mouse).add(line.mouseOffset));
        line.polyline.mesh.program.uniforms.uOpacity.value = 1.0;
      });
    }
  }
  window.addEventListener('mousemove', updateMouse, { passive: true });

  const tmp = new Vec3();
  let lastTime = performance.now();
  function update() {
    requestAnimationFrame(update);
    const currentTime = performance.now();
    const dt = currentTime - lastTime;
    lastTime = currentTime;

    lines.forEach((line) => {
      tmp
        .copy(mouse)
        .add(line.mouseOffset)
        .sub(line.points[0])
        .multiply(line.spring);
      line.mouseVelocity.add(tmp).multiply(line.friction);
      line.points[0].add(line.mouseVelocity);

      for (let i = 1; i < line.points.length; i++) {
        if (isFinite(CONFIG.maxAge) && CONFIG.maxAge > 0) {
          const segmentDelay = CONFIG.maxAge / (line.points.length - 1);
          const alpha = Math.min(
            1,
            (dt * CONFIG.speedMultiplier) / segmentDelay
          );
          line.points[i].lerp(line.points[i - 1], alpha);
        } else {
          line.points[i].lerp(line.points[i - 1], 0.9);
        }
      }

      const uniforms = line.polyline.mesh.program.uniforms;
      uniforms.uTime.value = currentTime * 0.001;
      // плавное перекрашивание под текущую тему
      const c = uniforms.uColor.value;
      c.r += (targetColor.r - c.r) * 0.08;
      c.g += (targetColor.g - c.g) * 0.08;
      c.b += (targetColor.b - c.b) * 0.08;

      line.polyline.updateGeometry();
    });

    renderer.render({ scene });
  }
  update();
}
