/**
 * @casys/mcp-tolerance
 *
 * MCP oracle for ISO 286-1:2010 dimensional tolerances and fits.
 * Computes fundamental tolerance IT values, hole/shaft deviation limits
 * (EI/ES, ei/es), and fit type (clearance/transition/interference) from
 * the normative formulas and tables. It also computes linear 1D stack-up
 * worst-case and RSS intervals — no external binaries, no LLM, no process
 * defaults. Every result carries an explicit provenance field.
 *
 * @module
 */

export {
  allTools,
  getCategories,
  getToolByName,
  getToolsByCategory,
  ToleranceToolsClient,
  toolsByCategory,
} from "./src/client.ts";
export type {
  MCPToolWireFormat,
  ToleranceTool,
  ToleranceToolCategory,
  ToleranceToolHandler,
  ToleranceToolsClientOptions,
} from "./src/client.ts";

export { fitTools } from "./src/tools/mod.ts";
export {
  FIT_VIEWER_NAME,
  FIT_VIEWER_URI,
  LIMITS_VIEWER_NAME,
  LIMITS_VIEWER_URI,
  STACKUP_VIEWER_NAME,
  STACKUP_VIEWER_URI,
  TOLERANCE_VIEWER_NAMES,
  TOOL_VIEWER_URIS,
} from "./src/ui/viewers.ts";

export {
  computeFit,
  DIAMETER_RANGES,
  findRangeIndex,
  fundamentalTolerance,
  geometricMean,
  holeDeviations,
  parseDesignation,
  shaftDeviations,
  SUPPORTED_HOLE_LETTERS,
  SUPPORTED_SHAFT_LETTERS,
  toleranceFactor,
} from "./src/api/iso286.ts";
export type {
  FitResult,
  FitType,
  HoleDeviations,
  HoleLetter,
  ShaftDeviations,
  ShaftLetter,
} from "./src/api/iso286.ts";
