(function () {
  const AXES = {
    x: { color: 0xc44f37, vector: new THREE.Vector3(1, 0, 0) },
    y: { color: 0x147d8f, vector: new THREE.Vector3(0, 1, 0) },
    z: { color: 0x6a7f2f, vector: new THREE.Vector3(0, 0, 1) }
  };

  function axisArrow(axis, length) {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: axis.color, roughness: .58 });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, length, 12), material);
    shaft.position.y = length / 2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.065, .18, 18), material);
    tip.position.y = length + .06;
    group.add(shaft, tip);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.vector);
    return group;
  }

  function outputScale(state) {
    const s = state.amount;
    const free = state.freeAxis || "y";
    const operation = state.operation || free;
    const values = { x: 1, y: 1, z: 1 };
    const others = ["x", "y", "z"].filter((axis) => axis !== free);
    const preserveFromFree = () => {
      values[free] = s;
      values[others[0]] = 1 / Math.sqrt(s);
      values[others[1]] = 1 / Math.sqrt(s);
    };

    if (state.step < 2) {
      preserveFromFree();
      return values;
    }
    if (operation === free) {
      preserveFromFree();
      return values;
    }
    if (operation === "uniform") {
      if (state.mode === "single") return { x: s, y: s, z: s };
      preserveFromFree();
      return values;
    }
    values[operation] = s;
    if (state.mode === "strict") {
      const compensation = others.find((axis) => axis !== operation);
      if (compensation) values[compensation] = 1 / s;
    }
    return values;
  }

  function createMaintainVolumeScene(canvas) {
    const shell = canvas.parentElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf4f1e9, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-3.8, 3.8, 3.1, -3.1, .1, 50);
    camera.position.set(4.6, 3.3, 6.8);
    camera.lookAt(0, .42, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8afa3, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 3);
    scene.add(key);

    const objectMaterial = new THREE.MeshStandardMaterial({
      color: 0xf2b84b,
      roughness: .68,
      metalness: .02
    });
    const geometry = new THREE.SphereGeometry(1, 48, 32);
    const object = new THREE.Mesh(geometry, objectMaterial);
    object.position.y = .45;
    scene.add(object);

    const ghost = new THREE.Group();
    const ghostMaterial = new THREE.MeshBasicMaterial({ color: 0x62676f, transparent: true, opacity: .28, depthWrite: false });
    const ringGeometry = new THREE.TorusGeometry(1, .012, 8, 96);
    const ringXY = new THREE.Mesh(ringGeometry, ghostMaterial);
    const ringXZ = new THREE.Mesh(ringGeometry, ghostMaterial);
    const ringYZ = new THREE.Mesh(ringGeometry, ghostMaterial);
    ringXZ.rotation.x = Math.PI / 2;
    ringYZ.rotation.y = Math.PI / 2;
    ghost.add(ringXY, ringXZ, ringYZ);
    ghost.position.copy(object.position);
    scene.add(ghost);

    const comparisonModes = ["strict", "uniform", "single"];
    const comparisonGroup = new THREE.Group();
    const comparison = comparisonModes.map((modeName, index) => {
      const mesh = new THREE.Mesh(geometry, objectMaterial);
      mesh.position.set((index - 1) * 1.55, .34, 0);
      const rest = new THREE.Group();
      [0, 1, 2].forEach((ringIndex) => {
        const ring = new THREE.Mesh(ringGeometry, ghostMaterial);
        if (ringIndex === 1) ring.rotation.x = Math.PI / 2;
        if (ringIndex === 2) ring.rotation.y = Math.PI / 2;
        rest.add(ring);
      });
      rest.position.copy(mesh.position);
      rest.scale.setScalar(.46);
      comparisonGroup.add(rest, mesh);
      return {
        modeName,
        mesh,
        current: new THREE.Vector3(.46, .46, .46),
        goal: new THREE.Vector3(.46, .46, .46)
      };
    });
    comparisonGroup.visible = false;
    scene.add(comparisonGroup);

    const axes = new THREE.Group();
    axes.position.copy(object.position);
    Object.values(AXES).forEach((axis) => axes.add(axisArrow(axis, 1.55)));
    scene.add(axes);

    const ground = new THREE.GridHelper(7, 10, 0xd7dbe2, 0xe4e1d9);
    ground.position.y = -.78;
    ground.material.transparent = true;
    ground.material.opacity = .48;
    scene.add(ground);

    let state = { step: 0, freeAxis: "y", mode: "strict", operation: "y", amount: 1 };
    const current = new THREE.Vector3(1, 1, 1);
    const goal = new THREE.Vector3(1, 1, 1);
    let disposed = false;

    function update(next) {
      state = Object.assign({}, state, next);
      const values = outputScale(state);
      goal.set(values.x, values.y, values.z);
      const comparing = state.step === 2;
      object.visible = !comparing;
      ghost.visible = !comparing;
      axes.visible = !comparing;
      comparisonGroup.visible = comparing;
      if (comparing) {
        comparison.forEach((item) => {
          const modeValues = outputScale(Object.assign({}, state, { mode: item.modeName }));
          item.goal.set(modeValues.x * .46, modeValues.y * .46, modeValues.z * .46);
        });
      }
      axes.children.forEach((arrow, index) => {
        const axisName = ["x", "y", "z"][index];
        arrow.scale.setScalar(axisName === state.freeAxis ? 1.08 : .86);
        arrow.children.forEach((mesh) => {
          mesh.material.opacity = axisName === state.freeAxis ? 1 : .62;
          mesh.material.transparent = axisName !== state.freeAxis;
        });
      });
      return values;
    }

    function resize() {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const viewHeight = 5.2;
      const aspect = width / height;
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(shell);
    resize();
    update(state);

    const clock = new THREE.Clock();
    function animate() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), .05);
      const smoothing = 1 - Math.pow(.002, delta);
      current.lerp(goal, smoothing);
      object.scale.copy(current);
      comparison.forEach((item) => {
        item.current.lerp(item.goal, smoothing);
        item.mesh.scale.copy(item.current);
      });
      renderer.render(scene, camera);
      canvas.dataset.ready = "true";
      requestAnimationFrame(animate);
    }
    animate();

    return {
      update,
      destroy() {
        disposed = true;
        observer.disconnect();
        renderer.dispose();
      }
    };
  }

  window.createMaintainVolumeScene = createMaintainVolumeScene;
  window.calculateMaintainVolumeScale = outputScale;
})();
