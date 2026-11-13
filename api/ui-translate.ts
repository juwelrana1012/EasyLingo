import { ApiRequestLike, ApiResponseLike, handleUiTranslate } from '../server/apiHandlers';

export default async function handler(req: ApiRequestLike, res: ApiResponseLike) {
  return handleUiTranslate(req, res);
}
