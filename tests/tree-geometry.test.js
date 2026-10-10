import assert from 'node:assert/strict';
import { buildTree, cloneTree, interpolateTree, TREE_PROFILES } from '../tree-geometry.js';

for (const depth of [6, 7]) {
  const poses = TREE_PROFILES.map((_, state) => buildTree(state, depth));
  const topology = poses[0].edges.map(({ a, b }) => [a, b]);
  const legacyOPairs = new Set(['1-2', '2-3', '3-4', '1-6', '6-5', '5-4']);
  for (const pose of poses) {
    assert.deepEqual(pose.edges.map(({ a, b }) => [a, b]), topology);
    assert.deepEqual(pose.tips, poses[0].tips);
    assert.ok(pose.edges.some((edge) => edge.a === 3), 'left O shoulder remains a canopy anchor');
    assert.ok(pose.edges.some((edge) => edge.a === 5), 'right O shoulder remains a canopy anchor');
    for (const edge of pose.edges) assert.ok(!legacyOPairs.has(`${edge.a}-${edge.b}`), 'legacy procedural O edge removed');
    assert.equal((pose.nodes[2].x + pose.nodes[6].x) / 2, pose.nodes[1].x, 'lower O anchors stay paired');
    assert.equal((pose.nodes[3].x + pose.nodes[5].x) / 2, pose.nodes[4].x, 'upper O anchors stay paired');
    assert.ok(Math.abs(pose.nodes[2].x - pose.nodes[6].x) > .05, 'O keeps a deliberate central silhouette');
    const rootTips = pose.tips.filter((index) => pose.nodes[index].y > .87);
    assert.equal(rootTips.length, 8, 'four primary roots split into eight fine endpoints');
    for (const n of pose.nodes) {
      assert.ok(n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1);
    }
  }
  for (let state = 0; state < 5; state += 1) {
    const a = poses[state]; const b = poses[(state + 1) % 5];
    let output = cloneTree(a);
    interpolateTree(a, b, 0, 1600, output);
    assert.deepEqual(output.nodes, a.nodes);
    for (let elapsed = 1; elapsed < 1900; elapsed += 13) {
      const previous = cloneTree(output);
      interpolateTree(a, b, elapsed, 1600, output);
      for (let i = 0; i < output.nodes.length; i += 1) {
        assert.ok(Number.isFinite(output.nodes[i].x));
        assert.ok(Math.hypot(output.nodes[i].x - previous.nodes[i].x, output.nodes[i].y - previous.nodes[i].y) < .015, 'bounded continuous movement');
      }
    }
    interpolateTree(a, b, 2000, 1600, output);
    assert.deepEqual(output.nodes, b.nodes);
  }
  console.log(`PASS depth ${depth}: ${poses[0].edges.length} organic/circuit edges; exact SVG O anchors and continuous morphs`);
}
