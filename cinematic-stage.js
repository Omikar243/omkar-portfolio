const initCinematicStage = () => {
  const stage = document.querySelector('#cinematicStage');
  const hero = document.querySelector('#heroVisual');
  const orbit = document.querySelector('[data-orbit-game]');
  const cards = [...document.querySelectorAll('.project-card')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!stage || !hero) return () => {};

  let activeObject = null;
  let drag = null;

  const setPointer = (event) => {
    const rect = stage.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    hero.style.setProperty('--stage-pointer-x', `${Math.max(-1, Math.min(1, x))}`);
    hero.style.setProperty('--stage-pointer-y', `${Math.max(-1, Math.min(1, y))}`);
  };
  const resetPointer = () => {
    hero.style.setProperty('--stage-pointer-x', '0');
    hero.style.setProperty('--stage-pointer-y', '0');
  };
  const setOrbitPointer = (event) => {
    if (!orbit || reduced.matches) return;
    const rect = orbit.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    orbit.style.setProperty('--orbit-pointer-x', `${Math.max(-1, Math.min(1, x))}`);
    orbit.style.setProperty('--orbit-pointer-y', `${Math.max(-1, Math.min(1, y))}`);
  };
  const resetOrbitPointer = () => {
    orbit?.style.setProperty('--orbit-pointer-x', '0');
    orbit?.style.setProperty('--orbit-pointer-y', '0');
  };

  const startDrag = (event) => {
    if (reduced.matches) return;
    activeObject = event.currentTarget;
    activeObject.setPointerCapture?.(event.pointerId);
    activeObject.classList.add('is-dragging');
    drag = { x: event.clientX, y: event.clientY, startX: parseFloat(activeObject.dataset.x || '0'), startY: parseFloat(activeObject.dataset.y || '0') };
  };
  const moveDrag = (event) => {
    if (!drag || !activeObject) return;
    const x = Math.max(-68, Math.min(68, drag.startX + event.clientX - drag.x));
    const y = Math.max(-52, Math.min(52, drag.startY + event.clientY - drag.y));
    activeObject.dataset.x = String(x);
    activeObject.dataset.y = String(y);
    activeObject.style.setProperty('--object-x', `${x}px`);
    activeObject.style.setProperty('--object-y', `${y}px`);
    activeObject.style.setProperty('--object-rotate', `${(x * 0.16).toFixed(2)}deg`);
  };
  const endDrag = (event) => {
    if (!activeObject) return;
    activeObject.releasePointerCapture?.(event.pointerId);
    activeObject.classList.remove('is-dragging');
    activeObject = null;
    drag = null;
  };

  const updateCard = (event) => {
    if (reduced.matches) return;
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    card.style.setProperty('--card-rx', `${(-y * 5.5).toFixed(2)}deg`);
    card.style.setProperty('--card-ry', `${(x * 6.5).toFixed(2)}deg`);
    card.classList.add('is-tilted');
  };
  const resetCard = (event) => {
    const card = event.currentTarget;
    card.style.setProperty('--card-rx', '0deg');
    card.style.setProperty('--card-ry', '0deg');
    card.classList.remove('is-tilted');
  };

  hero.addEventListener('pointermove', setPointer, { passive: true });
  hero.addEventListener('pointerleave', resetPointer, { passive: true });
  orbit?.addEventListener('pointermove', setOrbitPointer, { passive: true });
  orbit?.addEventListener('pointerleave', resetOrbitPointer, { passive: true });
  stage.querySelectorAll('[data-stage-object]').forEach((object) => {
    object.dataset.x = '0';
    object.dataset.y = '0';
    object.addEventListener('pointerdown', startDrag);
    object.addEventListener('pointermove', moveDrag);
    object.addEventListener('pointerup', endDrag);
    object.addEventListener('pointercancel', endDrag);
  });
  cards.forEach((card) => {
    card.addEventListener('pointermove', updateCard, { passive: true });
    card.addEventListener('pointerleave', resetCard, { passive: true });
    card.addEventListener('focusin', () => card.classList.add('is-tilted'));
    card.addEventListener('focusout', resetCard);
  });

  return () => {
    hero.removeEventListener('pointermove', setPointer);
    hero.removeEventListener('pointerleave', resetPointer);
    orbit?.removeEventListener('pointermove', setOrbitPointer);
    orbit?.removeEventListener('pointerleave', resetOrbitPointer);
    stage.querySelectorAll('[data-stage-object]').forEach((object) => {
      object.removeEventListener('pointerdown', startDrag);
      object.removeEventListener('pointermove', moveDrag);
      object.removeEventListener('pointerup', endDrag);
      object.removeEventListener('pointercancel', endDrag);
    });
    cards.forEach((card) => {
      card.removeEventListener('pointermove', updateCard);
      card.removeEventListener('pointerleave', resetCard);
    });
  };
};

export { initCinematicStage };
