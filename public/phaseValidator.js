export function buildPhaseLayout(cards, groupDefs) {
  const groups = groupDefs.map((group) => ({ ...group }));
  const allAssignments = assignGroupsAll(cards, groups, 0);
  if (!allAssignments.length) return null;

  allAssignments.sort((a, b) => scoreAssignment(a, cards) - scoreAssignment(b, cards));
  return { groups: allAssignments[0] };
}

function scoreAssignment(assignment, originalCards) {
  let wildCount = 0;
  const usedIds = new Set();
  
  assignment.forEach(group => {
    group.cards.forEach(card => {
      usedIds.add(card.id);
      if (card.type === "wild") wildCount++;
    });
  });

  const leftoverCards = originalCards.filter(c => !usedIds.has(c.id));
  const valueCounts = {};
  leftoverCards.forEach(c => {
    if (c.type === "number") {
      valueCounts[c.value] = (valueCounts[c.value] || 0) + 1;
    }
  });

  let leftoverPenalty = 0;
  for (const val in valueCounts) {
    if (valueCounts[val] === 1) leftoverPenalty += 10;
    else if (valueCounts[val] === 2) leftoverPenalty -= 5;
    else if (valueCounts[val] >= 3) leftoverPenalty -= 10;
  }

  return (wildCount * 100) + leftoverPenalty;
}

function assignGroupsAll(cards, groups, index) {
  if (index >= groups.length) {
    return [[]];
  }

  const group = groups[index];
  const combinations = getCombinations(cards, group.size);
  const validAssignments = [];

  for (const combo of combinations) {
    if (!matchesGroup(combo, group.type)) {
      continue;
    }
    const comboIds = new Set(combo.map((card) => card.id));
    const remaining = cards.filter((card) => !comboIds.has(card.id));
    
    const tails = assignGroupsAll(remaining, groups, index + 1);
    for (const tail of tails) {
      validAssignments.push([{ type: group.type, size: group.size, cards: combo }, ...tail]);
    }
  }
  
  return validAssignments;
}

function matchesGroup(cards, type) {
  if (cards.some((card) => card.type === "skip")) {
    return false;
  }
  if (type === "set") {
    return isValidSet(cards);
  }
  if (type === "run") {
    return isValidRun(cards);
  }
  if (type === "color") {
    return isValidColor(cards);
  }
  return false;
}

export function isValidSet(cards) {
  const numbers = cards.filter((card) => card.type === "number").map((card) => card.value);
  return new Set(numbers).size <= 1;
}

export function isValidColor(cards) {
  const colors = cards.filter((card) => card.type === "number").map((card) => card.color);
  return new Set(colors).size <= 1;
}

export function isValidRun(cards) {
  const wildCount = cards.filter((card) => card.type === "wild").length;
  const numbers = cards
    .filter((card) => card.type === "number")
    .map((card) => card.value)
    .sort((a, b) => a - b);

  if (new Set(numbers).size !== numbers.length) {
    return false;
  }
  if (!numbers.length) {
    return true;
  }

  const minStart = Math.max(1, numbers[numbers.length - 1] - cards.length + 1);
  const maxStart = Math.min(numbers[0], 12 - cards.length + 1);
  for (let start = minStart; start <= maxStart; start += 1) {
    const sequence = [];
    for (let value = start; value < start + cards.length; value += 1) {
      sequence.push(value);
    }
    const missing = sequence.filter((value) => !numbers.includes(value)).length;
    if (missing <= wildCount) {
      return true;
    }
  }
  return false;
}

export function canAddCardToGroup(card, group) {
  if (card.type === "skip") {
    return false;
  }
  const prospective = [...group.cards, card];
  if (group.type === "set") {
    return isValidSet(prospective);
  }
  if (group.type === "color") {
    return isValidColor(prospective);
  }
  if (group.type === "run") {
    return isValidRun(prospective);
  }
  return false;
}

export function getCombinations(cards, size) {
  const result = [];

  function walk(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < cards.length; i += 1) {
      combo.push(cards[i]);
      walk(i + 1, combo);
      combo.pop();
    }
  }

  walk(0, []);
  return result;
}
