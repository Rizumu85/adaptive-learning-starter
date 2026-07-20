(function () {
  function createScene(canvas) {
    const shell = canvas.parentElement;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf4f1e9, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4, 4, 3.2, -3.2, 0.1, 50);
    camera.position.set(0, 0.35, 10);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8afa3, 2.3));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 6, 3);
    scene.add(key);

    function material(color, opacity, roughness, metalness) {
      const value = opacity === undefined ? 1 : opacity;
      return new THREE.MeshStandardMaterial({
        color,
        roughness: roughness === undefined ? 0.52 : roughness,
        metalness: metalness === undefined ? 0 : metalness,
        transparent: value < 1,
        opacity: value,
        depthWrite: value === 1
      });
    }

    function makeBone(color, opacity, roughness, metalness) {
      const group = new THREE.Group();
      const boneMaterial = material(color, opacity, roughness, metalness);
      const bodyGeometry = new THREE.CylinderGeometry(0.073, 0.231, 1.217, 32);
      bodyGeometry.computeVertexNormals();
      const body = new THREE.Mesh(bodyGeometry, boneMaterial);
      body.position.y = 0.76;
      group.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.136, 24, 16), boneMaterial);
      group.add(head);
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 16), boneMaterial);
      tail.position.y = 1.5;
      group.add(tail);
      return group;
    }

    function makeBeacon() {
      const group = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), material(0xf2b84b, 1, 0.45, 0.02));
      ball.position.z = 0.18;
      group.add(ball);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.045, 12, 36), material(0xf2b84b, 1, 0.45, 0.02));
      ring.position.z = 0.12;
      group.add(ring);
      return group;
    }

    function makeArrow(color, length) {
      const group = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length - 0.24, 10), material(color));
      shaft.position.y = (length - 0.24) / 2;
      group.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.28, 14), material(color));
      head.position.y = length - 0.12;
      group.add(head);
      return group;
    }

    function makeLine(color, dashed) {
      const lineMaterial = dashed
        ? new THREE.LineDashedMaterial({ color, dashSize: 0.13, gapSize: 0.09 })
        : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.65 });
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const line = new THREE.Line(geometry, lineMaterial);
      if (dashed) line.computeLineDistances();
      scene.add(line);
      return line;
    }

    function setLine(line, start, end) {
      line.geometry.setFromPoints([start, end]);
      if (line.material.isLineDashedMaterial) line.computeLineDistances();
    }

    function makeLabel(text, className) {
      const label = document.createElement("div");
      label.className = `scene-label ${className}`;
      label.textContent = text;
      shell.appendChild(label);
      return label;
    }

    const labels = {
      target: makeLabel("Target", "label-target"),
      owner: makeLabel("Owner", "label-owner"),
      ghost: makeLabel("Owner 原位置", "label-ghost"),
      parent: makeLabel("Parent", "label-parent"),
      desired: makeLabel("约束想去的位置", "label-desired")
    };

    const target = makeBeacon();
    const owner = makeBone(0xede4d0, 1, 0.62, 0.05);
    const ghost = makeBone(0x62676f, 0.18, 0.55, 0);
    const parent = makeBone(0xede4d0, 0.56, 0.62, 0.05);
    const desired = makeBone(0xc44f37, 0.25, 0.52, 0);
    const pin = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.055, 12, 36), material(0xc44f37, 1, 0.52, 0));
    const roomArrow = makeArrow(0x6a7f2f, 1.65);
    const ownerArrow = makeArrow(0x147d8f, 1.65);
    const relationLine = makeLine(0xf2b84b, false);
    const blockedLine = makeLine(0xc44f37, true);
    scene.add(target, owner, ghost, parent, desired, pin, roomArrow, ownerArrow);

    const ownerTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -0.72));
    const ownerForward = new THREE.Vector3(0, 1, 0).applyQuaternion(ownerTilt);
    const roomForward = new THREE.Vector3(0, 1, 0);
    const ownerHome = new THREE.Vector3(1.4, -0.55, 0);
    const ownerVisual = ownerHome.clone();
    const ownerGoal = ownerHome.clone();
    const targetVisual = new THREE.Vector3(-1.8, -0.55, 0);
    const targetGoal = targetVisual.clone();
    let current = { step: 0, move: -0.8, offset: true, ownerSpace: "local", connected: true };
    let disposed = false;

    function update(next) {
      current = Object.assign({}, current, next);
      ghost.visible = false;
      labels.ghost.style.display = "none";
      labels.parent.style.display = "none";
      labels.desired.style.display = "none";
      parent.visible = false;
      desired.visible = false;
      pin.visible = false;
      roomArrow.visible = false;
      ownerArrow.visible = false;
      relationLine.visible = false;
      blockedLine.visible = false;
      owner.quaternion.copy(ownerTilt);
      targetGoal.set(-1.8, -0.55, 0);

      if (current.step === 0) {
        targetGoal.set(current.move, -0.55, 0);
        ownerGoal.copy(targetGoal);
        ghost.position.copy(ownerHome);
        ghost.quaternion.copy(ownerTilt);
        ghost.visible = true;
        labels.ghost.style.display = "block";
      }

      if (current.step === 1) {
        targetGoal.set(-1.25, -0.55, 0);
        ownerGoal.copy(current.offset ? targetGoal.clone().add(new THREE.Vector3(2.35, 0, 0)) : targetGoal);
        relationLine.visible = current.offset;
        setLine(relationLine, targetGoal, ownerGoal);
      }

      if (current.step === 2) {
        targetGoal.set(-2.15, -0.7, 0);
        const start = new THREE.Vector3(0.45, -0.85, 0);
        const direction = current.ownerSpace === "local" ? ownerForward : roomForward;
        ownerGoal.copy(start).addScaledVector(direction, 1.55);
        roomArrow.position.copy(start);
        ownerArrow.position.copy(start);
        ownerArrow.quaternion.copy(ownerTilt);
        roomArrow.visible = true;
        ownerArrow.visible = true;
      }

      if (current.step === 3) {
        const weld = new THREE.Vector3(1.25, -0.25, 0);
        targetGoal.set(-1.35, 0.75, 0);
        parent.position.set(weld.x, weld.y - 1.5, 0);
        parent.quaternion.identity();
        parent.visible = true;
        labels.parent.style.display = "block";
        ownerGoal.copy(current.connected ? weld : targetGoal);
        pin.position.copy(weld);
        pin.visible = current.connected;
        desired.position.copy(targetGoal);
        desired.quaternion.copy(ownerTilt);
        desired.visible = current.connected;
        labels.desired.style.display = current.connected ? "block" : "none";
        blockedLine.visible = current.connected;
        setLine(blockedLine, weld, targetGoal);
      }
    }

    function projectLabel(element, point, offsetX) {
      const projected = point.clone().project(camera);
      const rect = canvas.getBoundingClientRect();
      const rawX = (projected.x * 0.5 + 0.5) * rect.width + (offsetX || 0);
      const halfWidth = element.offsetWidth / 2;
      const safeX = Math.min(rect.width - halfWidth - 12, Math.max(halfWidth + 12, rawX));
      element.style.left = `${safeX}px`;
      element.style.top = `${(-projected.y * 0.5 + 0.5) * rect.height}px`;
    }

    function resize() {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      const aspect = width / height;
      const viewHeight = 6.3;
      camera.left = -viewHeight * aspect / 2;
      camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    resize();
    update(current);

    const clock = new THREE.Clock();
    function animate() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);
      const smoothing = 1 - Math.pow(0.002, delta);
      ownerVisual.lerp(ownerGoal, smoothing);
      targetVisual.lerp(targetGoal, smoothing);
      owner.position.copy(ownerVisual);
      target.position.copy(targetVisual);
      const overlap = ownerVisual.distanceTo(targetVisual) < 0.42;
      projectLabel(labels.target, targetVisual.clone().add(new THREE.Vector3(0, 0.42, 0)), overlap ? -34 : 0);
      projectLabel(labels.owner, ownerVisual.clone().add(new THREE.Vector3(0, 1.82, 0).applyQuaternion(ownerTilt)), overlap ? 34 : 0);
      if (ghost.visible) projectLabel(labels.ghost, ownerHome.clone().add(new THREE.Vector3(0, 1.82, 0).applyQuaternion(ownerTilt)));
      if (parent.visible) projectLabel(labels.parent, parent.position.clone().add(new THREE.Vector3(-0.45, 0.82, 0)));
      if (desired.visible) projectLabel(labels.desired, targetGoal.clone().add(new THREE.Vector3(0, 1.82, 0).applyQuaternion(ownerTilt)));
      renderer.render(scene, camera);
      canvas.dataset.ready = "true";
      requestAnimationFrame(animate);
    }
    animate();

    return {
      update,
      destroy() {
        disposed = true;
        resizeObserver.disconnect();
        Object.values(labels).forEach((label) => label.remove());
        renderer.dispose();
      }
    };
  }

  window.createPaperCourseCopyLocationScene = createScene;
})();
