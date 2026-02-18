export type Sector = { id: number; name: string };
export type Department = { id: number; name: string; sector?: Sector };

export type IndicatorGroup = { 
  id: number; 
  name: string; 
  department: Department;
  parent?: { id: number; name: string } | null;
  parent_id?: number | null;
  unit?: string;
  children?: Array<{ id: number; name: string; level: number }>;
  level: number;
  hierarchy_path: string;
  is_parent: boolean;
  inherited_unit: string;
  // Additional properties used in StateMinisterDashboard
  performance_percentage?: number | null;
  annual_target_aggregate?: number;
  performance_aggregate?: number;
  quarterly_breakdown_aggregate?: {
    q1: number;
    q2: number;
    q3: number;
    q4: number;
  };
  indicators?: Indicator[];
};

export type Indicator = {
  id: number;
  name: string;
  unit: string;
  description: string;
  target: number;
  achieved: number;
  performance_percentage: number;
};
