import { ApiRequestLike, ApiResponseLike, handleBulkWords } from '../../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleBulkWords(req, res);
}
