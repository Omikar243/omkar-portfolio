// Fixed topology: the O is a bifurcation of the trunk, not an added ring.
// Nodes are shared by every adjoining edge, including during delayed morphs.
export const TREE_PROFILES = [
  { name: 'rounded growth', spread: .48, length: .13, ratio: .69, curvature: .16, lean: -.025, loopWidth: .067, loopHeight: .172, square: 0, crown: 0 },
  { name: 'squared growth', spread: .64, length: .126, ratio: .67, curvature: .015, lean: .018, loopWidth: .075, loopHeight: .153, square: .9, crown: -.035 },
  { name: 'wide asymmetric growth', spread: .64, length: .147, ratio: .66, curvature: .2, lean: -.052, loopWidth: .087, loopHeight: .162, square: .1, crown: .008 },
  { name: 'botanical growth', spread: .38, length: .145, ratio: .69, curvature: .24, lean: .036, loopWidth: .06, loopHeight: .186, square: 0, crown: -.025 },
  { name: 'compact geometric growth', spread: .62, length: .109, ratio: .68, curvature: .04, lean: -.01, loopWidth: .066, loopHeight: .143, square: .98, crown: -.004 },
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
  const shoulder = lerp(.44, .065, p.square);
  const root = node(.493, .865, 0);
  const split = node(centerX - p.lean * .4, bottomY, 1);
  const leftLower = node(centerX - p.loopWidth, bottomY - p.loopHeight * shoulder, 2);
  const leftUpper = node(centerX - p.loopWidth + p.lean * .2, topY + p.loopHeight * shoulder, 2);
  const reunion = node(centerX + p.lean * .7, topY, 1);
  const rightUpper = node(centerX + p.loopWidth * .94 + p.lean * .2, topY + p.loopHeight * shoulder * .93, 2);
  const rightLower = node(centerX + p.loopWidth * .94, bottomY - p.loopHeight * shoulder * 1.05, 2);

  const trunkWidth = .0084;
  edge(root, split, .028 + p.lean * .2, -.079, 0, .058, trunkWidth, 0);
  const loopWidth = .0055;
  const h = p.loopHeight;
  const w = p.loopWidth;
  // These six edges ARE the two trunk limbs. They share split/reunion nodes.
  // Rounded and squared versions have identical connectivity and edge count.
  edge(split, leftLower, -w * .64, -h * .01, 0, h * .17, loopWidth, 1);
  edge(leftLower, leftUpper, -w * (.24 * (1 - p.square)), -h * .23,
    -w * (.19 * (1 - p.square)), h * .23, loopWidth * .86, 2);
  edge(leftUpper, reunion, 0, -h * .17, -w * .64, h * .01, loopWidth * .82, 1);
  edge(split, rightLower, w * .64, -h * .01, 0, h * .17, loopWidth * .91, 1);
  edge(rightLower, rightUpper, w * (.2 * (1 - p.square)), -h * .23,
    w * (.23 * (1 - p.square)), h * .23, loopWidth * .82, 2);
  edge(rightUpper, reunion, 0, -h * .17, w * .64, h * .01, loopWidth * .82, 1);

  const crown = node(nodes[reunion].x + p.lean * .6, topY - .054 + p.crown, 3);
  edge(reunion, crown, p.lean * .13, -.019, -p.lean * .13, .019, .0048, 2);

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
