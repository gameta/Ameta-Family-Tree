// Path Walker & Relationship Derivation Engine
// Finds paths between any two people and derives kinship labels

class FamilyGraph {
  constructor(data) {
    this.nodes = data.nodes;
    this.children = {};       // parentId -> [childId, ...]
    this.parents = {};        // childId -> { fathers: [id,...], mothers: [id,...] }
    this.spouses = {};        // personId -> [spouseId, ...]
    this.siblings = {};       // personId -> [siblingId, ...]
    this.adoptiveParents = {}; // childId -> [parentId, ...]
    this.adoptedChildren = {}; // parentId -> [childId, ...]

    this._buildIndex(data.edges);
    this._deriveGotras();
  }

  _buildIndex(edges) {
    for (const edge of edges) {
      if (edge.type === 'isFatherOf') {
        if (!this.children[edge.source]) this.children[edge.source] = [];
        this.children[edge.source].push(edge.target);
        if (!this.parents[edge.target]) this.parents[edge.target] = { fathers: [], mothers: [] };
        this.parents[edge.target].fathers.push(edge.source);
      } else if (edge.type === 'isMotherOf') {
        if (!this.children[edge.source]) this.children[edge.source] = [];
        this.children[edge.source].push(edge.target);
        if (!this.parents[edge.target]) this.parents[edge.target] = { fathers: [], mothers: [] };
        this.parents[edge.target].mothers.push(edge.source);
      } else if (edge.type === 'isAdoptiveFatherOf' || edge.type === 'isAdoptiveMotherOf') {
        if (!this.adoptiveParents[edge.target]) this.adoptiveParents[edge.target] = [];
        this.adoptiveParents[edge.target].push(edge.source);
        if (!this.adoptedChildren[edge.source]) this.adoptedChildren[edge.source] = [];
        this.adoptedChildren[edge.source].push(edge.target);
        // Also add to regular children/parents for traversal
        if (!this.children[edge.source]) this.children[edge.source] = [];
        this.children[edge.source].push(edge.target);
        if (!this.parents[edge.target]) this.parents[edge.target] = { fathers: [], mothers: [] };
        if (edge.type === 'isAdoptiveFatherOf') {
          this.parents[edge.target].fathers.push(edge.source);
        } else {
          this.parents[edge.target].mothers.push(edge.source);
        }
      } else if (edge.type === 'isSpouseOf') {
        if (!this.spouses[edge.source]) this.spouses[edge.source] = [];
        if (!this.spouses[edge.target]) this.spouses[edge.target] = [];
        if (!this.spouses[edge.source].includes(edge.target)) {
          this.spouses[edge.source].push(edge.target);
        }
        if (!this.spouses[edge.target].includes(edge.source)) {
          this.spouses[edge.target].push(edge.source);
        }
      }
    }

    // Derive siblings (share at least one parent)
    const parentToChildren = {};
    for (const [childId, parents] of Object.entries(this.parents)) {
      for (const fatherId of parents.fathers) {
        const key = 'f:' + fatherId;
        if (!parentToChildren[key]) parentToChildren[key] = [];
        parentToChildren[key].push(childId);
      }
      for (const motherId of parents.mothers) {
        const key = 'm:' + motherId;
        if (!parentToChildren[key]) parentToChildren[key] = [];
        parentToChildren[key].push(childId);
      }
    }
    for (const group of Object.values(parentToChildren)) {
      for (const person of group) {
        if (!this.siblings[person]) this.siblings[person] = [];
        for (const sibling of group) {
          if (sibling !== person && !this.siblings[person].includes(sibling)) {
            this.siblings[person].push(sibling);
          }
        }
      }
    }
  }

  // Derive gotra by tracing patrilineal line (father → father → ...)
  _deriveGotras() {
    for (const [id, node] of Object.entries(this.nodes)) {
      if (node.gotra) continue; // already set manually
      if (node.gender === 'M' || node.gender === null) {
        const gotra = this._traceGotra(id, new Set());
        if (gotra) node.gotra = gotra;
      }
    }
  }

  _traceGotra(personId, visited) {
    if (visited.has(personId)) return null;
    visited.add(personId);

    const node = this.nodes[personId];
    if (node && node.gotra) return node.gotra;

    // Follow patrilineal line
    const parentInfo = this.parents[personId];
    if (parentInfo && parentInfo.fathers.length > 0) {
      return this._traceGotra(parentInfo.fathers[0], visited);
    }

    // If no father found, use surname as proxy for gotra
    if (node && node.name) {
      const parts = node.name.split(' ');
      if (parts.length > 1) return parts[parts.length - 1];
    }
    return null;
  }

  getGotra(personId) {
    const node = this.nodes[personId];
    return node ? node.gotra || null : null;
  }

  // Get native town/village (mool gaon) - associated with gotra lineage
  getNativeTown(personId) {
    const node = this.nodes[personId];
    if (node && node.nativeTown) return node.nativeTown;
    // Trace patrilineage for native town (inherits like gotra)
    const lineage = this.getPatrilineage(personId);
    for (const ancestor of lineage) {
      const ancestorNode = this.nodes[ancestor.id];
      if (ancestorNode && ancestorNode.nativeTown) return ancestorNode.nativeTown;
    }
    return null;
  }

  // Get full patrilineal lineage (father, grandfather, great-grandfather, ...)
  getPatrilineage(personId, maxDepth = 20) {
    const lineage = [];
    let current = personId;
    const visited = new Set();

    while (current && !visited.has(current) && lineage.length < maxDepth) {
      visited.add(current);
      lineage.push({ id: current, name: this.getName(current) });
      const parentInfo = this.parents[current];
      current = (parentInfo && parentInfo.fathers.length > 0) ? parentInfo.fathers[0] : null;
    }
    return lineage;
  }

  isAdopted(personId) {
    return !!(this.adoptiveParents[personId] && this.adoptiveParents[personId].length > 0);
  }

  getGender(personId) {
    const node = this.nodes[personId];
    return node ? node.gender : null;
  }

  getName(personId) {
    const node = this.nodes[personId];
    return node ? node.name : personId;
  }

  getBirthYear(personId) {
    const node = this.nodes[personId];
    return node ? node.birthYear : null;
  }

  isElder(personA, personB) {
    const yearA = this.getBirthYear(personA);
    const yearB = this.getBirthYear(personB);
    if (yearA && yearB) return yearA < yearB;
    return null; // unknown
  }

  getNeighbors(personId) {
    const neighbors = [];
    const parentInfo = this.parents[personId] || { fathers: [], mothers: [] };

    for (const fatherId of parentInfo.fathers) {
      neighbors.push({ id: fatherId, relation: 'father' });
    }
    for (const motherId of parentInfo.mothers) {
      neighbors.push({ id: motherId, relation: 'mother' });
    }

    const children = this.children[personId] || [];
    for (const childId of children) {
      const childGender = this.getGender(childId);
      neighbors.push({ id: childId, relation: childGender === 'F' ? 'daughter' : 'son' });
    }

    const spouses = this.spouses[personId] || [];
    for (const spouseId of spouses) {
      const spouseGender = this.getGender(spouseId);
      neighbors.push({ id: spouseId, relation: 'spouse.' + (spouseGender || 'U') });
    }

    const siblings = this.siblings[personId] || [];
    for (const sibId of siblings) {
      const sibGender = this.getGender(sibId);
      const seniority = this.isElder(sibId, personId);
      let rel = 'sibling.' + (sibGender || 'U');
      if (seniority === true) rel += '.elder';
      else if (seniority === false) rel += '.younger';
      neighbors.push({ id: sibId, relation: rel });
    }

    return neighbors;
  }

  // BFS to find shortest path between two people
  findPath(fromId, toId, maxDepth = 10) {
    if (fromId === toId) return [];

    const queue = [{ id: fromId, path: [] }];
    const visited = new Set([fromId]);

    while (queue.length > 0) {
      const { id, path } = queue.shift();

      if (path.length >= maxDepth) continue;

      const neighbors = this.getNeighbors(id);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;

        const newPath = [...path, {
          from: id,
          to: neighbor.id,
          relation: neighbor.relation,
          fromName: this.getName(id),
          toName: this.getName(neighbor.id)
        }];

        if (neighbor.id === toId) return newPath;

        visited.add(neighbor.id);
        queue.push({ id: neighbor.id, path: newPath });
      }
    }

    return null; // no path found
  }

  // Find ALL paths up to maxDepth (for showing multiple relationship routes)
  findAllPaths(fromId, toId, maxDepth = 8) {
    const results = [];

    const dfs = (currentId, path, visited) => {
      if (path.length > maxDepth) return;
      if (currentId === toId && path.length > 0) {
        results.push([...path]);
        return;
      }

      const neighbors = this.getNeighbors(currentId);
      for (const neighbor of neighbors) {
        if (visited.has(neighbor.id)) continue;

        visited.add(neighbor.id);
        path.push({
          from: currentId,
          to: neighbor.id,
          relation: neighbor.relation,
          fromName: this.getName(currentId),
          toName: this.getName(neighbor.id)
        });

        dfs(neighbor.id, path, visited);

        path.pop();
        visited.delete(neighbor.id);
      }
    };

    const visited = new Set([fromId]);
    dfs(fromId, [], visited);

    return results.sort((a, b) => a.length - b.length);
  }

  // Get the Lowest Common Ancestor of two people
  findLCA(personA, personB) {
    const ancestorsA = this._getAncestors(personA);
    const ancestorsB = this._getAncestors(personB);

    for (const [ancestorId, depthA] of ancestorsA) {
      if (ancestorsB.has(ancestorId)) {
        return {
          ancestor: ancestorId,
          name: this.getName(ancestorId),
          depthFromA: depthA,
          depthFromB: ancestorsB.get(ancestorId)
        };
      }
    }
    return null;
  }

  _getAncestors(personId) {
    const ancestors = new Map();
    const queue = [{ id: personId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift();
      if (ancestors.has(id)) continue;
      ancestors.set(id, depth);

      const parentInfo = this.parents[id] || { fathers: [], mothers: [] };
      for (const fatherId of parentInfo.fathers) {
        queue.push({ id: fatherId, depth: depth + 1 });
      }
      for (const motherId of parentInfo.mothers) {
        queue.push({ id: motherId, depth: depth + 1 });
      }
    }

    return ancestors;
  }

  // Get N generations around a focal person (for ego-centric view)
  getEgoNetwork(personId, depth = 3) {
    const nodes = new Set();
    const edges = [];
    const queue = [{ id: personId, currentDepth: 0 }];
    const visited = new Set();

    while (queue.length > 0) {
      const { id, currentDepth } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);
      nodes.add(id);

      if (currentDepth >= depth) continue;

      const neighbors = this.getNeighbors(id);
      for (const neighbor of neighbors) {
        nodes.add(neighbor.id);
        edges.push({ source: id, target: neighbor.id, relation: neighbor.relation });

        if (!visited.has(neighbor.id)) {
          queue.push({ id: neighbor.id, currentDepth: currentDepth + 1 });
        }
      }
    }

    return {
      nodes: Array.from(nodes).map(id => ({
        id,
        name: this.getName(id),
        gender: this.getGender(id),
        birthYear: this.getBirthYear(id)
      })),
      edges
    };
  }

  // Get all people as searchable list
  getAllPeople() {
    return Object.entries(this.nodes)
      .map(([id, node]) => ({ id, name: node.name, gender: node.gender }))
      .filter(p => p.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Kinship label resolver - matches a path against the rule table
class KinshipResolver {
  constructor(rules) {
    this.rules = rules;
  }

  resolve(path) {
    const pathPattern = path.map(hop => hop.relation);

    // Try exact match first
    for (const rule of this.rules) {
      if (this._matchesPattern(pathPattern, rule.pattern)) {
        return { hi: rule.hi, en: rule.en, path };
      }
    }

    // Try partial/flexible match (strip seniority qualifiers)
    for (const rule of this.rules) {
      if (this._matchesFlexible(pathPattern, rule.pattern)) {
        return { hi: rule.hi, en: rule.en, path, approximate: true };
      }
    }

    // Composite: decompose path into chained segments
    const composite = this._resolveComposite(path);
    if (composite) return composite;

    // Fallback: describe the path in English
    return {
      hi: null,
      en: this._describePath(path),
      path,
      unknown: true
    };
  }

  // Decompose a long path into chained recognized segments
  // e.g., "Mausa ke Mama ke Pota" for mother→sister→husband→mother→brother→son→son
  _resolveComposite(path) {
    // Try colloquial (simplified) first, then strict
    const colloquial = this._resolveColloquial(path);
    const strict = this._resolveStrict(path);

    if (colloquial && strict) {
      // Return both, prefer colloquial as primary
      return {
        hi: colloquial.hi,
        en: colloquial.en,
        hiStrict: strict.hi,
        enStrict: strict.en,
        path,
        composite: true,
        segments: colloquial.segments,
        segmentsStrict: strict.segments
      };
    }
    return strict || colloquial;
  }

  // Colloquial: collapse cousins into siblings, then re-resolve
  // In Indian families, cousins ARE brothers/sisters, so their children = Bhatija/Bhanji
  _resolveColloquial(path) {
    const simplified = this._simplifyPath(path);
    if (!simplified || simplified.length === path.length) return null; // no simplification possible

    const segments = this._greedyDecompose(simplified);
    if (!segments || segments.length === 0) return null;

    return this._buildChain(segments, simplified);
  }

  // Strict: literal decomposition without collapsing
  _resolveStrict(path) {
    const segments = this._greedyDecompose(path);
    if (!segments || segments.length === 0) return null;

    return this._buildChain(segments, path);
  }

  // Simplify a path by collapsing cousin patterns into sibling
  // parent → sibling → child  ==>  sibling (cousin treated as sibling)
  _simplifyPath(path) {
    const simplified = [];
    let i = 0;

    while (i < path.length) {
      // Detect cousin pattern: parent(father/mother) → sibling → child(son/daughter)
      if (i + 2 < path.length) {
        const hop1 = path[i].relation;
        const hop2 = path[i + 1].relation;
        const hop3 = path[i + 2].relation;

        const isParentHop = (hop1 === 'father' || hop1 === 'mother');
        const isSiblingHop = hop2.startsWith('sibling');
        const isChildHop = (hop3 === 'son' || hop3 === 'daughter');

        if (isParentHop && isSiblingHop && isChildHop) {
          // Collapse: cousin treated as sibling
          const targetGender = hop3 === 'son' ? 'M' : 'F';
          const sibRelation = 'sibling.' + targetGender;
          simplified.push({
            from: path[i].from,
            to: path[i + 2].to,
            relation: sibRelation,
            fromName: path[i].fromName,
            toName: path[i + 2].toName
          });
          i += 3;
          continue;
        }
      }

      simplified.push(path[i]);
      i++;
    }

    return simplified;
  }

  _buildChain(segments, path) {
    const hiParts = [];
    const enParts = [];

    for (const seg of segments) {
      if (seg.hi) {
        const hindiOnly = seg.hi.split('(')[0].trim();
        hiParts.push(hindiOnly);
      } else {
        const fallback = this._describeHopHindi(seg.hops[seg.hops.length - 1].relation);
        hiParts.push(fallback);
      }
      if (seg.en) {
        enParts.push(seg.en);
      }
    }

    // Join with का/की/के — possessive agrees with the FOLLOWING (possessed) noun's gender
    // "X की बेटी" (X's daughter), "X का बेटा" (X's son)
    let hiChain = '';
    for (let i = 0; i < hiParts.length; i++) {
      if (i > 0) {
        const thisTarget = segments[i].targetGender;
        if (thisTarget === 'F') hiChain += ' की ';
        else hiChain += ' का ';
      }
      hiChain += hiParts[i];
    }

    const enChain = enParts.join("'s ");

    return {
      hi: hiChain || null,
      en: enChain,
      path,
      composite: true,
      segments
    };
  }

  // Greedy decomposition: from the start of the path, find the longest
  // prefix that matches a rule, consume it, repeat from the next person's perspective
  _greedyDecompose(path) {
    const segments = [];
    let i = 0;

    while (i < path.length) {
      let bestMatch = null;
      let bestLength = 0;

      // Try all lengths from longest to shortest starting at position i
      for (let len = Math.min(path.length - i, 5); len >= 1; len--) {
        const subPath = path.slice(i, i + len);
        const subPattern = subPath.map(hop => hop.relation);

        // Try exact match
        for (const rule of this.rules) {
          if (this._matchesPattern(subPattern, rule.pattern)) {
            bestMatch = rule;
            bestLength = len;
            break;
          }
        }
        if (bestMatch) break;

        // Try flexible match
        for (const rule of this.rules) {
          if (this._matchesFlexible(subPattern, rule.pattern)) {
            bestMatch = rule;
            bestLength = len;
            break;
          }
        }
        if (bestMatch) break;
      }

      if (bestMatch) {
        const targetHop = path[i + bestLength - 1];
        segments.push({
          hi: bestMatch.hi,
          en: bestMatch.en,
          hops: path.slice(i, i + bestLength),
          targetGender: this._inferGender(targetHop)
        });
        i += bestLength;
      } else {
        // No rule matches even a single hop - use raw description
        const hop = path[i];
        segments.push({
          hi: null,
          en: this._describeHop(hop.relation),
          hops: [hop],
          targetGender: this._inferGender(hop)
        });
        i++;
      }
    }

    return segments.length > 1 ? segments : null;
  }

  _inferGender(hop) {
    const rel = hop.relation;
    if (rel === 'mother' || rel === 'daughter' || rel.includes('.F')) return 'F';
    if (rel === 'father' || rel === 'son' || rel.includes('.M')) return 'M';
    return null;
  }

  _describeHop(relation) {
    const map = {
      'father': 'Father', 'mother': 'Mother',
      'son': 'Son', 'daughter': 'Daughter',
      'spouse.M': 'Husband', 'spouse.F': 'Wife',
    };
    if (map[relation]) return map[relation];
    if (relation.startsWith('sibling.M')) return 'Brother';
    if (relation.startsWith('sibling.F')) return 'Sister';
    if (relation.startsWith('spouse')) return 'Spouse';
    return relation;
  }

  _describeHopHindi(relation) {
    const map = {
      'father': 'पिता', 'mother': 'माँ',
      'son': 'बेटा', 'daughter': 'बेटी',
      'spouse.M': 'पति', 'spouse.F': 'पत्नी',
    };
    if (map[relation]) return map[relation];
    if (relation.startsWith('sibling.M')) return 'भाई';
    if (relation.startsWith('sibling.F')) return 'बहन';
    if (relation.startsWith('spouse')) return 'जीवनसाथी';
    return relation;
  }

  _matchesPattern(pathPattern, rulePattern) {
    if (pathPattern.length !== rulePattern.length) return false;
    for (let i = 0; i < pathPattern.length; i++) {
      if (!this._hopMatches(pathPattern[i], rulePattern[i])) return false;
    }
    return true;
  }

  _matchesFlexible(pathPattern, rulePattern) {
    if (pathPattern.length !== rulePattern.length) return false;
    for (let i = 0; i < pathPattern.length; i++) {
      if (!this._hopMatchesFlexible(pathPattern[i], rulePattern[i])) return false;
    }
    return true;
  }

  _hopMatches(actual, expected) {
    // exact match
    if (actual === expected) return true;
    // "sibling.M.elder" matches "sibling.M.elder"
    // "spouse.F" matches "spouse.F"
    return false;
  }

  _hopMatchesFlexible(actual, expected) {
    // "sibling.M.elder" flexibly matches "sibling.M" (without seniority)
    const actualParts = actual.split('.');
    const expectedParts = expected.split('.');

    if (actualParts[0] !== expectedParts[0]) return false;
    if (expectedParts.length >= 2 && actualParts.length >= 2) {
      if (expectedParts[1] !== actualParts[1]) return false;
    }
    // If rule doesn't specify seniority, any seniority matches
    if (expectedParts.length === 2 && actualParts.length === 3) return true;
    if (expectedParts.length === 1 && actualParts.length >= 1) return true;

    return actual === expected;
  }

  _describePath(path) {
    return path.map(hop => {
      const parts = hop.relation.split('.');
      let desc = parts[0];
      if (parts[1] === 'M') desc += ' (male)';
      if (parts[1] === 'F') desc += ' (female)';
      if (parts[2] === 'elder') desc += ' (elder)';
      if (parts[2] === 'younger') desc += ' (younger)';
      return desc;
    }).join(' → ');
  }
}

// Export for use in main app
if (typeof module !== 'undefined') {
  module.exports = { FamilyGraph, KinshipResolver };
}
