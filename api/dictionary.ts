import { ApiRequestLike, ApiResponseLike, handleDictionary } from '../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleDictionary(req, res);
}
