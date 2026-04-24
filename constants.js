export const HAND_SIZE = 10;

export const PHASES = [
  { id: 1, label: "2 sets of 3", groups: [{ type: "set", size: 3 }, { type: "set", size: 3 }] },
  { id: 2, label: "1 set of 3 and 1 run of 4", groups: [{ type: "set", size: 3 }, { type: "run", size: 4 }] },
  { id: 3, label: "1 set of 4 and 1 run of 4", groups: [{ type: "set", size: 4 }, { type: "run", size: 4 }] },
  { id: 4, label: "1 run of 7", groups: [{ type: "run", size: 7 }] },
  { id: 5, label: "1 run of 8", groups: [{ type: "run", size: 8 }] },
  { id: 6, label: "1 run of 9", groups: [{ type: "run", size: 9 }] },
  { id: 7, label: "2 sets of 4", groups: [{ type: "set", size: 4 }, { type: "set", size: 4 }] },
  { id: 8, label: "7 cards of one color", groups: [{ type: "color", size: 7 }] },
  { id: 9, label: "1 set of 5 and 1 set of 2", groups: [{ type: "set", size: 5 }, { type: "set", size: 2 }] },
  { id: 10, label: "1 set of 5 and 1 set of 3", groups: [{ type: "set", size: 5 }, { type: "set", size: 3 }] }
];

export const COLORS = ["red", "blue", "green", "yellow"];
