import { Router, type IRouter } from "express";
import * as yaml from "js-yaml";
import {
  createSession,
  getSession,
  updateSession,
  getRequirement,
  updateRequirement,
  getCase,
  updateCase,
  type GeneratedCase,
  type ExtractedRequirement,
} from "../lib/sessionStore";
import { extractRequirements, generateCases } from "../lib/mockPipeline";

const router: IRouter = Router();

// POST /sessions
router.post("/sessions", async (req, res): Promise<void> => {
  const { specText, specTitle } = req.body as { specText: string; specTitle?: string };
  if (!specText || typeof specText !== "string") {
    res.status(400).json({ error: "specText is required" });
    return;
  }
  const session = createSession(specText, specTitle);
  res.status(201).json(session);
});

// GET /sessions/:sessionId
router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(session);
});

// POST /sessions/:sessionId/extract
router.post("/sessions/:sessionId/extract", async (req, res): Promise<void> => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  updateSession(sessionId, { stage: "extracting" });

  const requirements = await extractRequirements(session.specText, session.specTitle);

  updateSession(sessionId, {
    requirements,
    stage: "reviewing_requirements",
  });

  res.json({ sessionId, requirements });
});

// POST /sessions/:sessionId/generate
router.post("/sessions/:sessionId/generate", async (req, res): Promise<void> => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const { requirementIds } = req.body as { requirementIds?: string[] };

  updateSession(sessionId, { stage: "generating" });

  // Filter to only the requested requirements (or all included if not specified)
  const targetReqs: ExtractedRequirement[] = requirementIds
    ? session.requirements.filter((r) => requirementIds.includes(r.requirementId))
    : session.requirements.filter((r) => r.included);

  const cases = await generateCases(targetReqs, session.specTitle);

  updateSession(sessionId, {
    cases,
    stage: "reviewing_cases",
  });

  res.json({ sessionId, cases });
});

// PATCH /sessions/:sessionId/requirements/:requirementId
router.patch(
  "/sessions/:sessionId/requirements/:requirementId",
  async (req, res): Promise<void> => {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    const requirementId = Array.isArray(req.params.requirementId)
      ? req.params.requirementId[0]
      : req.params.requirementId;

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const existing = getRequirement(session, requirementId);
    if (!existing) {
      res.status(404).json({ error: "Requirement not found" });
      return;
    }

    const { included, text } = req.body as { included?: boolean; text?: string };
    const updated = updateRequirement(session, requirementId, {
      ...(included !== undefined ? { included } : {}),
      ...(text !== undefined ? { text } : {}),
    });

    res.json(updated);
  }
);

// POST /sessions/:sessionId/requirements/:requirementId/regenerate
router.post(
  "/sessions/:sessionId/requirements/:requirementId/regenerate",
  async (req, res): Promise<void> => {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    const requirementId = Array.isArray(req.params.requirementId)
      ? req.params.requirementId[0]
      : req.params.requirementId;

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const req_ = getRequirement(session, requirementId);
    if (!req_) {
      res.status(404).json({ error: "Requirement not found" });
      return;
    }

    const { nudge } = req.body as { nudge?: string };
    req.log.info({ nudge }, "Regenerating cases for requirement (mock)");

    // Remove old cases for this requirement, then generate new ones
    const freshSession = getSession(sessionId)!;
    const otherCases = freshSession.cases.filter(
      (c) => c.sourceRequirementId !== requirementId
    );

    const newCases = await generateCases([req_], session.specTitle);

    const allCases: GeneratedCase[] = [...otherCases, ...newCases];
    updateSession(sessionId, { cases: allCases });

    res.json(newCases);
  }
);

// PATCH /sessions/:sessionId/cases/:caseId
router.patch(
  "/sessions/:sessionId/cases/:caseId",
  async (req, res): Promise<void> => {
    const sessionId = Array.isArray(req.params.sessionId)
      ? req.params.sessionId[0]
      : req.params.sessionId;
    const caseId = Array.isArray(req.params.caseId)
      ? req.params.caseId[0]
      : req.params.caseId;

    const session = getSession(sessionId);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const existing = getCase(session, caseId);
    if (!existing) {
      res.status(404).json({ error: "Case not found" });
      return;
    }

    const { status, case: caseData } = req.body as {
      status?: "draft" | "approved" | "dropped";
      case?: GeneratedCase["case"];
    };

    const updated = updateCase(session, caseId, {
      ...(status !== undefined ? { status } : {}),
      ...(caseData !== undefined ? { case: caseData } : {}),
    });

    res.json(updated);
  }
);

// POST /sessions/:sessionId/export
router.post("/sessions/:sessionId/export", async (req, res): Promise<void> => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const approvedCases = session.cases
    .filter((c) => c.status === "approved")
    .map((c) => c.case);

  if (approvedCases.length === 0) {
    res.status(422).json({ error: "No approved cases to export" });
    return;
  }

  // Basic schema validation: every case must have required fields
  const validationErrors: string[] = [];
  for (const c of approvedCases) {
    if (!c.id) validationErrors.push(`Case missing id`);
    if (!c.suite) validationErrors.push(`Case ${c.id}: missing suite`);
    if (!c.description) validationErrors.push(`Case ${c.id}: missing description`);
    if (!c.category) validationErrors.push(`Case ${c.id}: missing category`);
    if (!c.input?.messages?.length) validationErrors.push(`Case ${c.id}: missing input messages`);
    if (!c.expected?.behaviour) validationErrors.push(`Case ${c.id}: missing expected behaviour`);
    if (!c.expected?.graders?.length) validationErrors.push(`Case ${c.id}: missing graders`);
  }

  if (validationErrors.length > 0) {
    res.status(422).json({ error: "Validation failed", validationErrors });
    return;
  }

  updateSession(sessionId, { stage: "exported" });

  const yamlStr = yaml.dump(approvedCases, { lineWidth: 120 });
  const jsonStr = JSON.stringify(approvedCases, null, 2);

  res.json({
    yaml: yamlStr,
    json: jsonStr,
    caseCount: approvedCases.length,
    validationErrors: [],
  });
});

// GET /sessions/:sessionId/coverage
router.get("/sessions/:sessionId/coverage", async (req, res): Promise<void> => {
  const sessionId = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const approvedCases = session.cases.filter((c) => c.status === "approved");
  const droppedCases = session.cases.filter((c) => c.status === "dropped");
  const draftCases = session.cases.filter((c) => c.status === "draft");

  const distribution = {
    task_success: 0,
    guardrail: 0,
    format: 0,
    tool_use: 0,
  };

  for (const c of approvedCases) {
    const cat = c.case.category as keyof typeof distribution;
    if (cat in distribution) distribution[cat]++;
  }

  const coveredReqIds = new Set(approvedCases.map((c) => c.sourceRequirementId));
  const uncoveredRequirements = session.requirements.filter(
    (r) => r.included && r.testable && !coveredReqIds.has(r.requirementId)
  );

  res.json({
    categoryDistribution: distribution,
    uncoveredRequirements,
    totalApproved: approvedCases.length,
    totalDropped: droppedCases.length,
    totalDraft: draftCases.length,
  });
});

export default router;
