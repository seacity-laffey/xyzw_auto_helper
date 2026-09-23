// Upstream 5e1d8ba game configuration snapshot; keep generated data separate from rules.
import snapshot from "../assets/data/apexSnapshot.json" with { type: "json" };

export const {
  APEX_TAOTAI_STAGES,
  apexConstantConf,
  apexScheduleMap,
  apexSeasonConf,
  apexStageNames,
  apexSupportLevels,
} = snapshot;
