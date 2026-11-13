import { ApiRequestLike, ApiResponseLike, handleTranslate } from '../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleTranslate(req, res);
}
