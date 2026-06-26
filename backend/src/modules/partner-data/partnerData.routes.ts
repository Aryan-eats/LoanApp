import { Router } from 'express';
import { validateUUIDParam } from '../../shared/middleware/validateUUID.js';
import {
  bulkCreateStoredClients,
  createStoredClient,
  deleteStoredClient,
  getPartnerCustomerActivity,
  getPartnerCustomerById,
  getStoredClients,
  saveStoredClientDocuments,
  submitStoredClientToGPS,
  updateStoredClientAssignedBank,
  updateStoredClientNotes,
  updateStoredClientPreferredBank,
  updateStoredClientStatus,
} from './partnerData.controller.js';

const router = Router();

router.param('id', validateUUIDParam);

router.post('/stored-clients/bulk', bulkCreateStoredClients);
router.get('/customers/:id', getPartnerCustomerById);
router.get('/customers/:id/activity', getPartnerCustomerActivity);
router.route('/stored-clients')
  .get(getStoredClients)
  .post(createStoredClient);
router.patch('/stored-clients/:id/status', updateStoredClientStatus);
router.patch('/stored-clients/:id/notes', updateStoredClientNotes);
router.patch('/stored-clients/:id/assigned-bank', updateStoredClientAssignedBank);
router.patch('/stored-clients/:id/preferred-bank', updateStoredClientPreferredBank);
router.put('/stored-clients/:id/documents', saveStoredClientDocuments);
router.post('/stored-clients/:id/submit', submitStoredClientToGPS);
router.delete('/stored-clients/:id', deleteStoredClient);

export default router;
