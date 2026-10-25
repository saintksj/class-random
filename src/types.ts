export interface Student {
  id: string;
  name: string;
  pickedCount: number;
  isActive: boolean; // can toggle participating in the draw
}

export interface PickHistory {
  id: string;
  studentName: string;
  timestamp: string;
}

export interface PresetClass {
  id: string;
  className: string;
  students: string[];
}
