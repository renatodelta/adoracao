import { onRequest as apiHandler } from './api.js';

export async function onRequest(context) {
  return apiHandler(context);
}
