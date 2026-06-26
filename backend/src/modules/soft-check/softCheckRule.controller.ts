import type { Request, Response } from 'express';
import {
  activateRuleSet,
  approveRuleSet,
  createDraftRuleSet,
  listRuleSets,
  submitRuleSet,
} from './softCheckRuleAdmin.service.js';

const actorId = (req: Request): string => req.user!.id;
const reason = (req: Request): string => String(req.body.reason ?? req.body.changeReason ?? '').trim();
const ruleSetId = (req: Request): string => String(req.params.id);

const handle = async (res: Response, work: () => Promise<unknown>) => {
  try {
    res.status(200).json({ success: true, data: await work() });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : 'Rule administration failed',
    });
  }
};

export const listSoftCheckRuleSets = async (req: Request, res: Response): Promise<void> =>
  handle(res, () => listRuleSets(req.query.productCode ? String(req.query.productCode) : undefined));

export const createSoftCheckRuleSet = async (req: Request, res: Response): Promise<void> =>
  handle(res, () =>
    createDraftRuleSet({
      productId: String(req.body.productId),
      version: Number(req.body.version),
      configHash: String(req.body.configHash),
      changeReason: reason(req),
      actorUserId: actorId(req),
    })
  );

export const submitSoftCheckRuleSet = async (req: Request, res: Response): Promise<void> =>
  handle(res, () => submitRuleSet(ruleSetId(req), actorId(req), reason(req)));

export const approveSoftCheckRuleSet = async (req: Request, res: Response): Promise<void> =>
  handle(res, () => approveRuleSet(ruleSetId(req), actorId(req), reason(req)));

export const activateSoftCheckRuleSet = async (req: Request, res: Response): Promise<void> =>
  handle(res, () => activateRuleSet(ruleSetId(req), actorId(req), reason(req)));
