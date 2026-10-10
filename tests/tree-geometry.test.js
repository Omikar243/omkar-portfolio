import assert from 'node:assert/strict';
import { buildTree, cloneTree, interpolateTree, TREE_PROFILES } from '../tree-geometry.js';

for (const depth of [6, 7]) {
  const poses = TREE_PROFILES.map((_, s) => buildTree(s, depth));
  const topology = poses[0].edges.map(({ a, b }) => [a, b]);
  for (const pose of poses) {
    assert.deepEqual(pose.edges.map(({ a, b }) => [a, b]), topology);
    assert.deepEqual(pose.tips, poses[0].tips);
    assert.equal(pose.edges[1].a, pose.edges[4].a, 'trunk splits into two limbs');
    assert.equal(pose.edges[3].b, pose.edges[6].b, 'both limbs rejoin');
    assert.equal(pose.edges[7].a, pose.edges[3].b, 'crown starts at reunion');
    for (const n of pose.nodes) {
      assert.ok(n.x > 0 && n.x < 1 && n.y > 0 && n.y < 1);
    }
    // Entire graph is reachable from trunk root, including all six O-limb edges.
    const visited = new Set([0]);
    let count;
    do {
      count = visited.size;
      for (const edge of pose.edges) if (visited.has(edge.a)) visited.add(edge.b);
    } while (count !== visited.size);
    assert.equal(visited.size, pose.nodes.length);
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
        assert.ok(Math.hypot(output.nodes[i].x - previous.nodes[i].x,
          output.nodes[i].y - previous.nodes[i].y) < .015, 'bounded continuous movement');
      }
    }
    interpolateTree(a, b, 2000, 1600, output);
    assert.deepEqual(output.nodes, b.nodes);
    // Retarget mid-flight from the exact last interpolated shared graph.
    interpolateTree(a, b, 811, 1600, output);
    const snapshot = cloneTree(output);
    const newOutput = cloneTree(output);
    interpolateTree(snapshot, poses[(state + 2) % 5], 0, 1600, newOutput);
    assert.deepEqual(newOutput.nodes, snapshot.nodes);
    assert.deepEqual(newOutput.edges, snapshot.edges);
  }
  console.log(`PASS depth ${depth}: ${poses[0].edges.length} connected edges; all five forms, continuous morphs and interruption continuity`);
}
