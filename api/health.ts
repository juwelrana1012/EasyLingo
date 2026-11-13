import { ApiRequestLike, ApiResponseLike, handleHealth } from '../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleHealth(req, res);
}
