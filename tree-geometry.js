// Fixed topology: the O is a bifurcation of the trunk, not an added ring.
// Nodes are shared by every adjoining edge, including during delayed morphs.
export const TREE_PROFILES = [
  { name: 'rounded growth', spread: .48, length: .13, ratio: .69, curvature: .16, lean: -.04, tilt: -.018, loopWidth: .067, loopHeight: .182, square: 0, crown: 0 },
  { name: 'squared growth', spread: .64, length: .126, ratio: .67, curvature: .015, lean: .05, tilt: .026, loopWidth: .078, loopHeight: .151, square: .96, crown: -.035 },
  { name: 'wide asymmetric growth', spread: .64, length: .147, ratio: .66, curvature: .2, lean: -.06, tilt: -.025, loopWidth: .086, loopHeight: .166, square: .1, crown: .008 },
  { name: 'botanical growth', spread: .38, length: .145, ratio: .69, curvature: .24, lean: .06, tilt: .03, loopWidth: .06, loopHeight: .19, square: 0, crown: -.025 },
  { name: 'compact geometric growth', spread: .62, length: .109, ratio: .68, curvature: .04, lean: -.06, tilt: -.027, loopWidth: .072, loopHeight: .143, square: .98, crown: -.004 },
];

const lerp = (a, b, t) => t === 0 ? a : t === 1 ? b : a + (b - a) * t;
export const quintic = (t) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const noise = (id, salt) => {
  const n = Math.sin((id + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return n - Math.floor(n);
};

export function buildTree(state = 0, depth = 7) {
  const p = TREE_PROFILES[state];
  const nodes = [];
  const edges = [];
  const tips = [];
  const node = (x, y, level) => {
    nodes.push({ x, y, level });
    return nodes.length - 1;
  };
  const edge = (a, b, c1x, c1y, c2x, c2y, width, level) => {
    // Controls are offsets from their shared endpoints, not disconnected points.
    edges.push({ a, b, c1x, c1y, c2x, c2y, width, level });
  };
  const line = (a, b, width, level, bend = 0) => {
    const dx = nodes[b].x - nodes[a].x;
    const dy = nodes[b].y - nodes[a].y;
    edge(a, b, dx / 3 - dy * bend, dy / 3 + dx * bend,
      -dx / 3 - dy * bend, -dy / 3 + dx * bend, width, level);
  };

  const centerX = .5 + p.lean * .32;
  const bottomY = .636;
  const topY = bottomY - p.loopHeight;
  // The O anchor nodes remain available for exact SVG geometry and canopy
  // junctions; the visible letterform is no longer a procedural edge graph.
  const shoulder = lerp(.22, .16, p.square);
  const root = node(centerX, .832, 0);
  // Lean translates the O from bottom to top as one clean silhouette. The
  // paired left/right nodes remain equal around their local center, so an O
  // can slant without becoming crooked or accidentally pinched.
  const split = node(centerX, bottomY, 1);
  const topCenter = centerX + p.tilt;
  const leftLower = node(centerX - p.loopWidth, bottomY - p.loopHeight * shoulder, 2);
  const leftUpper = node(topCenter - p.loopWidth, topY + p.loopHeight * shoulder, 2);
  const reunion = node(topCenter, topY, 1);
  const rightUpper = node(topCenter + p.loopWidth, topY + p.loopHeight * shoulder, 2);
  const rightLower = node(centerX + p.loopWidth, bottomY - p.loopHeight * shoulder, 2);

  const trunkWidth = .0084;
  edge(root, split, .028 + p.lean * .2, -.079, 0, .058, trunkWidth, 0);
  // Exact O outline is rendered by the synchronized SVG ellipse/rect below;
  // no procedural curve, random point or Bezier edge is used for the letter.

  const crown = node(nodes[reunion].x + p.lean * .6, topY - .054 + p.crown, 3);
  edge(reunion, crown, p.lean * .13, -.019, -p.lean * .13, .019, .0048, 2);

  const rootGrow = (parent, length, angle, remaining, width, level, id) => {
    const start = nodes[parent];
    const direction = angle + (noise(id, 12) - .5) * .08;
    const end = node(start.x + Math.cos(direction) * length,
      start.y + Math.sin(direction) * length, level);
    line(parent, end, width, level, (noise(id, 13) - .5) * p.curvature * .8);
    if (remaining === 0) { tips.push(end); return; }
    const splitAngle = .52 + (noise(id, 14) - .5) * .1;
    const nextLength = length * (.5 + noise(id, 15) * .08);
    rootGrow(end, nextLength, direction - splitAngle, remaining - 1,
      width * .58, level + 1, id * 2 + 17);
    rootGrow(end, nextLength * (.86 + noise(id, 16) * .1), direction + splitAngle,
      remaining - 1, width * .54, level + 1, id * 2 + 23);
  };
  // Four primary roots keep the lower composition grounded without symmetry.
  const rootAngles = [2.2, 1.86, 1.26, .9];
  const rootLengths = [.07, .064, .068, .074];
  for (let i = 0; i < rootAngles.length; i += 1) {
    rootGrow(root, rootLengths[i] * (state === 2 && i === 0 ? .9 : 1),
      rootAngles[i] + p.lean * (i < 2 ? -.12 : .1), 1, .0031, 1, 80 + i);
  }

  const grow = (parent, length, angle, remaining, width, level, id) => {
    const start = nodes[parent];
    const direction = angle + (noise(id, 1) - .5) * .12;
    const end = node(start.x + Math.cos(direction) * length,
      start.y + Math.sin(direction) * length, level);
    line(parent, end, width, level, (noise(id, 2) - .5) * p.curvature);
    if (remaining === 0) { tips.push(end); return; }
    const splitAngle = p.spread + (noise(id, 3) - .5) * .14;
    const nextLength = length * p.ratio * (.94 + noise(id, 4) * .10);
    grow(end, nextLength, direction - splitAngle, remaining - 1,
      width * .71, level + 1, id * 2 + 1);
    grow(end, nextLength * (.91 + noise(id, 5) * .13), direction + splitAngle,
      remaining - 1, width * .68, level + 1, id * 2 + 2);
  };
  // The three fixed canopies grow from actual trunk junctions, including shoulders.
  grow(crown, p.length * .88, -Math.PI / 2 + p.lean, depth, .0036, 3, 1);
  grow(leftUpper, p.length * 1.05, -2.27 + p.lean, depth - 1, .0038, 3, 2);
  grow(rightUpper, p.length * (state === 2 ? .9 : 1.04), -1.00 + p.lean,
    depth - 1, .0036, 3, 3);
  return { nodes, edges, tips, state };
}

export function cloneTree(tree) {
  return { ...tree, nodes: tree.nodes.map((n) => ({ ...n })),
    edges: tree.edges.map((e) => ({ ...e })), tips: [...tree.tips] };
}

// The trunk moves first. Twigs follow without disconnected junctions because
// both touching edges always read the same delayed shared-node position.
export function interpolateTree(from, to, elapsed, duration, output) {
  const progress = (level) => quintic((elapsed - Math.min(level, 9) * 32) / duration);
  for (let i = 0; i < from.nodes.length; i += 1) {
    const a = from.nodes[i]; const b = to.nodes[i]; const n = output.nodes[i];
    const t = progress(a.level);
    n.x = lerp(a.x, b.x, t);
    n.y = lerp(a.y, b.y, t);
  }
  for (let i = 0; i < from.edges.length; i += 1) {
    const a = from.edges[i]; const b = to.edges[i]; const e = output.edges[i];
    const t = progress(a.level);
    e.c1x = lerp(a.c1x, b.c1x, t);
    e.c1y = lerp(a.c1y, b.c1y, t);
    e.c2x = lerp(a.c2x, b.c2x, t);
    e.c2y = lerp(a.c2y, b.c2y, t);
    e.width = lerp(a.width, b.width, t);
  }
  return output;
}
